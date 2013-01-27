# [Krooshal Appcelerator&reg; Titanum&reg; SDK Example (v0.5)](https://www.krooshal.com/get_started)

##Basic Setup

1. Add the `krooshal.js` (from within Krooshal SDK) to your project.
1. Add `var krooshal = require('krooshal');` to the files in which you wish to access Krooshal.
1. Invoke `install` and `checkForUpdate` methods.

##Example code

```js
//Require Krooshal
var krslInstallation = require('krslInstallation');

//Install Krooshal
krslInstallation.install(YOUR_API_KEY, function() {
  
  //Optionally persist installationId in your app logic
    Ti.API.info('Krooshal installed with ' + krslInstallation.getInstallationId());
    
    //Associate attributes with this installation
    krslInstallation.tag(['red', 'blue']);
    
    //Check for update
    krslInstallation.checkForUpdate();
});
```

## To run this sample

1. Ensure proper installation of `Titanium Studio`, `android sdk` and/or `Xcode`
1. Import `Krooshal Example` project into your workspace
1. Register your app and get apiKey from [krooshal.com](https://www.krooshal.com/app)
1. Open app.js and paste in your apiKey
1. Build and run your project

##Requirements

- Titanium&reg; SDK 2.x +
- Internet connectivity