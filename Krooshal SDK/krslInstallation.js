// krslInstallation.js (v0.5)
//
// Copyright (c) 2013 Krooshal (http://krooshal.com/)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var KrooshalInstallation = function() {
	function property(apiKey, key, value) {
		//Including apiKey in the key so that if apiKey changes, we get new installationId
		key = "Krooshal_" + apiKey + "_" + key;
		if (value === undefined) {
			var v = Ti.App.Properties.getString(key);
			if (v) {
				try {
					return JSON.parse(v);
				} 
				catch (e) {
				}
			}
			return null;			
		}
		Ti.App.Properties.setString(key, JSON.stringify(value));
	}
	function xhrOpen(apiKey, urlPart, method, params, onLoad, onError) {
		try {
			var apiPath = 'https://api.krooshal.com/1/installations';
			var installationId = property(apiKey, 'installationId');
			if (installationId) {
				info("Prior installation detected (" + installationId + ")");
				apiPath += '/' + installationId;
			}
			else {
				info("No prior installation detected");
			}
			if (urlPart) {
				apiPath += '/' + urlPart;
			}
			info(method + "ing xhr to " + apiPath + " with " + JSON.stringify(params));
			var xhr = Ti.Network.createHTTPClient({
				onload: function() {
					info("Received " + this.responseText + " with status " + this.status);
					if (typeof(onLoad) == 'function') {
						onLoad.call(this);
					}
				},
				onerror: function(e) {
					error("HTTPClient response: " +this.status + " with " + this.responseText);
					if (typeof(onError) == 'function') {
						onError.call(this);
					}
				}
			});
			xhr.open(method, apiPath);
			xhr.setRequestHeader('X-Krooshal-Api-Key', apiKey);
			if (params) {
				xhr.setRequestHeader("Content-Type", "application/json");
				xhr.send(JSON.stringify(params));
			}
			else {
				xhr.send();
			}
		} 
		catch (e) {
		}
	}
	function info(message) {
		Ti.API.info("Krooshal: " + message);
	}
	function error(message) {
		Ti.API.error("Krooshal: " + message);
	}
	
	return {
		install: function(apiKey, onInstall) {
			var thisRef = this;
			if (!apiKey) {
				error('Api Key is required');
				return;
			}
			thisRef.apiKey = apiKey;
			var environment = {
				'osType': Ti.Platform.osname, 
				'osVersion': Ti.Platform.version, 
				'deviceType': Ti.Platform.model, 
				'deviceMaker': Ti.Platform.manufacturer || Ti.Platform.name,
				'appVersion': Ti.App.version,
				'appBundle': Ti.App.id, 
				'timeZone': (new Date()).toString().replace(/^.*\(/,"").replace(/\).*$/,""), 
				'language': Ti.Locale.currentLanguage,
				'stack': 'titanium'
			};
			xhrOpen(thisRef.apiKey, '', 'POST', environment, function() {
				try {
					var response = JSON.parse(this.responseText);
					if (response && response.installationId) {
						installationId = JSON.parse(this.responseText).installationId;
						info("Installed with id (" + installationId + ")");
						property(thisRef.apiKey, 'installationId', installationId);
					}
					if (typeof(onInstall) == 'function') {
						try {
							onInstall();
						}
						catch (e) {
							error("onInstall callback: " + e);
						}
					}
				} 
				catch (e) {
				}
			}, function() {
				if (this.status == 404) {
					//installationId is corrupt. Clear it and retry
					if (thisRef.getInstallationId()) {
						property(thisRef.apiKey, 'installationId', null);
						thisRef.install(apiKey, onInstall);
					}
				}
			});
		},
		getInstallationId: function() {
			var thisRef = this;
			return property(thisRef.apiKey, 'installationId');
		},
		checkForUpdate: function() {
			var thisRef = this;
			xhrOpen(thisRef.apiKey, 'status', 'GET', null, function() {
				try {
					var response = JSON.parse(this.responseText);
					if (!response || !response.actions) return;
					var buttons = [];
					for(var i in response.actions) {
						buttons.push(response.actions[i].label);
					}
					var dialog = Ti.UI.createAlertDialog({
					    buttonNames: buttons,
					    message: response.message,
					    title: response.title
				  	});
				 	dialog.addEventListener('click', function(e) {
				 		try {
					 		thisRef.inDisplay = false;
					 		var action = response.actions[e.index];
					 		if (!action) {
					 			//back button pressed. Invoke another checkForUpdate
					 			thisRef.checkForUpdate();
					 			return;
					 		}
					 		xhrOpen(thisRef.apiKey, 'actions', 'POST', {'action': action.type});
					 		var target = action.target;
					 		if (!target) {
					 			return;
					 		}
					 		switch(target.type) {
					 			case "url":
					 				if (!target.data) {
					 					return;
					 				}
									Titanium.Platform.openURL(target.data);
					 			break;
					 			case "android_intent":
						 			if (Ti.Platform.name != 'android') {
						 				return;
						 			}
						 			var androidIntent = target.data;
						 			if (!androidIntent) {
						 				return;
						 			}
						 			var intent = Ti.Android.createIntent({
										action: androidIntent.action || Ti.Android.ACTION_VIEW,
										data: androidIntent.data || action.targetUrl,
										type: androidIntent.type
									});
									var extra = action.targetAndroidIntent.extra;
									if (extra) {
										for(var i in extra) {
											intent.putExtra(i, extra[i]);
										}
									}
									Ti.Android.currentActivity.startActivity(intent);
					 			break;
					 		}
					 	} 
						catch (e) {
						}
				  	});
				  	if (thisRef.inDisplay) {
				  		return;
				  	}
				  	dialog.show();
				  	thisRef.inDisplay = true;
				} 
				catch (e) {
				}
			}, function() {
				error("checkForUpate failed. Try again after calling install(apiKey, onInstall)");
			});
		},
		tag: function(tags) {
			var thisRef = this;
			xhrOpen(thisRef.apiKey, 'tags', 'POST', {'tags': tags}, null, function() {
				error("tag failed. Try again after calling install(apiKey, onInstall)");
			});
		}
	};
};

KrooshalInstallation.instance = new KrooshalInstallation();

//initialize Krooshal and calls back onInstall when done
exports.install = function(apiKey, onInstall) {
	KrooshalInstallation.instance.install(apiKey, onInstall);
};
//checks for availability of update
exports.checkForUpdate = function() {
	KrooshalInstallation.instance.checkForUpdate();
};
//optionally your app can tag this installation with any custom tags, making it easy to identify it when creating rules on krooshal.com
exports.tag = function(tags) {
	KrooshalInstallation.instance.tag(tags);
};

exports.getInstallationId = function() {
	return KrooshalInstallation.instance.getInstallationId();
}