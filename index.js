
const say = require('say')


let Service, Characteristic, HeatingCoolingStateToRelayPin;
const OFF = true;
const ON = false;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-alexa-hyundai', 'AlexaHyundai', Thermostat);
};

class Thermostat {
  constructor(log, config) {
    this.log = log;
    this.name = config.name;
    this.maxTemperature = config.maxTemperature || 28;
    this.minTemperature = config.minTemperature || 18;
    this.delayBeforePinRequestMs = config.config || 10000;
    this.pin = config.pin || "0000";
    this.serviceName = config.serviceName || "BlueLink";
    this.carName = config.carName || "Sonata";
    this.voice = config.voice || "voice_kal_diphone";
    this.voiceSpeed = config.voiceSpeed || 1.0;
    this.startDelay = 800;
    this.heatingCoolingTimeMs = (config.heatingCoolingTimeMin || 10) * 60 * 1000;

    this.currentTemperature = 24;
    this.targetTemperature = 24;

    this.heatingCoolingThresholdTemperature = 24;

    //Characteristic.TemperatureDisplayUnits.CELSIUS = 0;
    //Characteristic.TemperatureDisplayUnits.FAHRENHEIT = 1;
    this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;

    // The value property of CurrentHeatingCoolingState must be one of the following:
    //Characteristic.CurrentHeatingCoolingState.OFF = 0;
    //Characteristic.CurrentHeatingCoolingState.HEAT = 1;
    //Characteristic.CurrentHeatingCoolingState.COOL = 2;
    this.currentHeatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;

    // The value property of TargetHeatingCoolingState must be one of the following:
    //Characteristic.TargetHeatingCoolingState.OFF = 0;
    //Characteristic.TargetHeatingCoolingState.HEAT = 1;
    //Characteristic.TargetHeatingCoolingState.COOL = 2;
    //Characteristic.TargetHeatingCoolingState.AUTO = 3;
    this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.OFF;

    this.thermostatService = new Service.Thermostat(this.name);
  }

  get currentlyRunning() {
    return this.systemStateName(this.currentHeatingCoolingState);
  }


  identify(callback) {
    this.log('Identify requested!');
    callback(null);
  }

  systemStateName(heatingCoolingState) {
    if (heatingCoolingState === Characteristic.CurrentHeatingCoolingState.HEAT) {
      return 'Heat';
    } else if (heatingCoolingState === Characteristic.CurrentHeatingCoolingState.COOL) {
      return 'Cool';
    } else {
      return 'Off';
    }
  }

  sendTurnOnCommand() {
    var unitsText = "";
    if (this.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.CELSIUS) {
      unitsText = "CELSIUS";
    } else if (this.temperatureDisplayUnits == Characteristic.TemperatureDisplayUnits.FAHRENHEIT) {
      unitsText = "FAHRENHEIT";
    }
    var message = "Alexa . . . , Tell "+this.serviceName+ " to start "+this.carName+" and set temperature for "+this.targetTemperature + " " + unitsText;
    this.currentTemperature = this.targetTemperature;
    this.currentHeatingCoolingState = this.targetHeatingCoolingState;
    this.thermostatService.setCharacteristic(Characteristic.CurrentTemperature, this.currentTemperature);
    say.speak(message, this.voice, this.voiceSpeed, (err) => {
      if (err) {
        return console.error(err)
      }
      setTimeout(() => {
        say.speak(""+this.pin, this.voice, this.voiceSpeed, (err) => {
          if (err) {
            return console.error(err)
          }
        });
      }, this.delayBeforePinRequestMs);

    });

  }

  sendTurnOffCommand() {
    var messageSpeakingSpeed = 1.0;
    var message = "Alexa . . . , Tell "+this.serviceName+ " to stop "+this.carName+" ";
    say.speak(message, this.voice, this.voiceSpeed, (err) => {
      if (err) {
        return console.error(err)
      }
      setTimeout(() => {
        say.speak(""+this.pin, this.voice, this.voiceSpeed, (err) => {
          if (err) {
            return console.error(err)
          }
        });
      }, this.delayBeforePinRequestMs);
    });
  }


  turnOnSystem(systemToTurnOn) {
    if (this.currentHeatingCoolingState === Characteristic.CurrentHeatingCoolingState.OFF) {
      if (!this.startSystemTimer) {
        this.log(`STARTING ${this.systemStateName(systemToTurnOn)} in ${this.startDelay / 1000} second(s)`);
        this.startSystemTimer = setTimeout(() => {
          this.log(`START ${this.systemStateName(systemToTurnOn)}`);
          this.sendTurnOnCommand();
          this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, systemToTurnOn);
          setTimeout( () => {
              this.log("Ended heating/cooling");
              this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, Characteristic.CurrentHeatingCoolingState.OFF);
              this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.OFF);
          }, this.heatingCoolingTimeMs);
        }, this.startDelay);
      } else {
        this.log(`STARTING ${this.systemStateName(systemToTurnOn)} soon...`);
      }
    } else if (this.currentHeatingCoolingState !== systemToTurnOn) {
      this.turnOffSystem();
    }
  }


  get timeSinceLastHeatingCoolingStateChange() {
    return new Date() - this.lastCurrentHeatingCoolingStateChangeTime;
  }

  turnOffSystem() {
    if (!this.stopSystemTimer) {
      this.sendTurnOffCommand();
      this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, Characteristic.CurrentHeatingCoolingState.OFF)
    } else {
      this.log(`INFO ${this.currentlyRunning} is already stopped.`);
    }
  }

  updateSystem() {
    if (this.timeSinceLastHeatingCoolingStateChange < this.minimumOnOffTime) {
      const waitTime = this.minimumOnOffTime - this.timeSinceLastHeatingCoolingStateChange;
      return;
    }

    if ( (this.targetHeatingCoolingState !== Characteristic.TargetHeatingCoolingState.OFF && this.currentHeatingCoolingState == Characteristic.TargetHeatingCoolingState.OFF)
      || (this.targetHeatingCoolingState !== Characteristic.TargetHeatingCoolingState.OFF
              && this.targetTemperature !== this.currentTemperature)) {

      if (this.targetTemperature < this.heatingCoolingThresholdTemperature) {
          this.turnOnSystem(Characteristic.CurrentHeatingCoolingState.COOL);
      } else {
          this.turnOnSystem(Characteristic.CurrentHeatingCoolingState.HEAT);
      }
    } else if (this.currentHeatingCoolingState !== Characteristic.CurrentHeatingCoolingState.OFF
        && this.targetHeatingCoolingState === Characteristic.TargetHeatingCoolingState.OFF) {
      this.turnOffSystem();
    }
  }

  getServices() {
    const informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, 'AlexaHyundai')
      .setCharacteristic(Characteristic.Model, this.carName)
      .setCharacteristic(Characteristic.SerialNumber, 'fake serial');

    // Off, Heat, Cool
    this.thermostatService
      .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on('get', callback => {
        this.log('CurrentHeatingCoolingState:', this.currentHeatingCoolingState);
        callback(null, this.currentHeatingCoolingState);
      })
      .on('set', (value, callback) => {
        this.log('SET CurrentHeatingCoolingState from', this.currentHeatingCoolingState, 'to', value);
        this.currentHeatingCoolingState = value;
        this.lastCurrentHeatingCoolingStateChangeTime = new Date();
        if (this.currentHeatingCoolingState === Characteristic.CurrentHeatingCoolingState.OFF) {
          this.stopSystemTimer = null;
        } else {
          this.startSystemTimer = null;
        }
        callback(null);
      });

    // Off, Heat, Cool, Auto
    this.thermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('get', callback => {
        this.log('TargetHeatingCoolingState:', this.targetHeatingCoolingState);
        callback(null, this.targetHeatingCoolingState);
      })
      .on('set', (value, callback) => {
        this.log('SET TargetHeatingCoolingState from', this.targetHeatingCoolingState, 'to', value);
        this.targetHeatingCoolingState = value;
        this.updateSystem();
        callback(null);
      });

    // Current Temperature
    this.thermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 0.1
      })
      .on('get', callback => {
        this.log('CurrentTemperature:', this.currentTemperature);
        callback(null, this.currentTemperature);
      })
      .on('set', (value, callback) => {
        this.updateSystem();
        callback(null);
      });

    // Target Temperature
    this.thermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 0.1
      })
      .on('get', callback => {
        this.log('TargetTemperature:', this.targetTemperature);
        callback(null, this.targetTemperature);
      })
      .on('set', (value, callback) => {
        this.log('SET TargetTemperature from', this.targetTemperature, 'to', value);
        this.targetTemperature = value;
        this.updateSystem();
        callback(null);
      });

    // °C or °F for units
    this.thermostatService
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', callback => {
        this.log('TemperatureDisplayUnits:', this.temperatureDisplayUnits);
        callback(null, this.temperatureDisplayUnits);
      })
      .on('set', (value, callback) => {
        this.log('SET TemperatureDisplayUnits from', this.temperatureDisplayUnits, 'to', value);
        this.temperatureDisplayUnits = value;
        callback(null);
      });



    // Auto max temperature
    this.thermostatService
      .getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 0.1
      })
      .on('get', callback => {
        this.log('CoolingThresholdTemperature:', this.heatingCoolingThresholdTemperature);
        callback(null, this.heatingCoolingThresholdTemperature);
      })
      .on('set', (value, callback) => {
        this.log('SET CoolingThresholdTemperature from', this.heatingCoolingThresholdTemperature, 'to', value);
        callback(null);
      });

    // Auto min temperature
    this.thermostatService
      .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .setProps({
        minValue: this.minTemperature,
        maxValue: this.maxTemperature,
        minStep: 0.1
      })
      .on('get', callback => {
        this.log('HeatingThresholdTemperature:', this.heatingCoolingThresholdTemperature);
        callback(null, this.heatingCoolingThresholdTemperature);
      })
      .on('set', (value, callback) => {
        this.log('SET HeatingThresholdTemperature from', this.heatingCoolingThresholdTemperature, 'to', value);
        callback(null);
      });

    this.thermostatService
      .getCharacteristic(Characteristic.Name)
      .on('get', callback => {
        callback(null, this.name);
      });



    return [informationService, this.thermostatService];
  }
}
