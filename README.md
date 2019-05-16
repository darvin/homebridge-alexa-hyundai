# Homebridge Alexa Hyundai plugin


## Installation
* Install nodejs and other dependencies for homebridge to work
```sh
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs libavahi-compat-libdnssd-dev
```
* Install homebridge and this plugin
```sh
sudo npm install -g --unsafe-perm homebridge homebridge-alexa-hyundai
```
* Add the accessory config to your homebridge config file located at this path `~/.homebridge/config.json`.
```json
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "description": "",
  "accessories": [
    {
      "accessory": "AlexaHyundai",
      "name": "My Sonata",
      "serviceName": "BlueLink",
      "carName": "Sonata",
      "heatingCoolingTimeMin":15,
      "pin": "3410",
      "delayBeforePinRequestMs":3000
    }

  ],
  "platforms": []
}
```
* Start it up by running `homebridge` command.

## Configuration


## Screenshots

<img width="320px" title="Auto Setting" src ="https://user-images.githubusercontent.com/498669/34306432-116a3cfc-e711-11e7-9fae-6662bd781fde.PNG" />
<img width="320px" title="Auto Setting Temperature" src ="https://user-images.githubusercontent.com/498669/34306435-14f0e088-e711-11e7-88e5-6803eff486f4.PNG" />
<img width="320px" title="Heat Setting Temperature" src ="https://user-images.githubusercontent.com/498669/34306426-0ddd1636-e711-11e7-9f1d-2f39141eadf2.PNG" />
<img width="320px" title="Info Screen Part 1" src ="https://user-images.githubusercontent.com/498669/34306428-0f9f2f04-e711-11e7-87c9-6c3b9b7e88fe.PNG" />
<img width="320px" title="Info Screen Part 2" src ="https://user-images.githubusercontent.com/498669/34306425-0c499448-e711-11e7-957b-ce92402b4d49.PNG" />
