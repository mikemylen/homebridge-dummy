"use strict";

var PythonShell = require('python-shell');
var Service, Characteristic, HomebridgeAPI;

module.exports = function(homebridge) {

	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	HomebridgeAPI = homebridge;
	homebridge.registerAccessory("@mikemylen/homebridge-dummy", "DummyPythonSwitch", DummyPythonSwitch);
}

function DummyPythonSwitch(log, config) {
	this.log = log;
	this.name = config.name;
	this.stateful = config.stateful;
	this.reverse = config.reverse;
	this.time = config.time ? config.time : 1000;		
	this.resettable = config.resettable;
	this.timer = null;
	this.pythonScriptPath = config.pythonScriptPath;
	this.pythonScriptName = config.pythonScriptName;
	this.pythonScriptHost = config.pythonScriptHost;
	this.pythonScriptAppKey = config.pythonScriptAppKey;

	this._service = new Service.Switch(this.name);
	
	this.cacheDirectory = HomebridgeAPI.user.persistPath();
	this.storage = require('node-persist');
	this.storage.initSync({dir:this.cacheDirectory, forgiveParseErrors: true});
	
	this._service.getCharacteristic(Characteristic.On)
		.on('set', this._setOn.bind(this));

	if (this.reverse) this._service.setCharacteristic(Characteristic.On, true);

	if (this.stateful) {
    	var cachedState = this.storage.getItemSync(this.name);
    	if ((cachedState === undefined) || (cachedState === false)) {
    		this._service.setCharacteristic(Characteristic.On, false);
    	} else {
    		this._service.setCharacteristic(Characteristic.On, true);
    	}
	}
}

DummyPythonSwitch.prototype.getServices = function() {
	return [this._service];
}

DummyPythonSwitch.prototype._setOn = function(on, callback) {
	this.log("Setting switch to " + on);
	
	if (on) {
    	this.log("Calling python script")
    	var options = {};
    	options.scriptPath = this.pythonScriptPath;
    	options.args = [this.pythonScriptHost, this.pythonScriptAppKey]
    
    	PythonShell.run(this.pythonScriptName, options, function (err, results) {
    			if (err) {
    					this.log("Script Error", options.scriptPath, options.args, err);
    					if(callback) callback(err);
    			} else {
    					// results is an array consisting of messages collected during execution
    					this.log('%j', results);
    					//this.outputState = value;
    
    					//this.log("outputState is now %s", this.outputState);
    					//if(callback) callback(null); // success
    			}
    	}.bind(this));
	}

	if (on && !this.reverse && !this.stateful) {
		if (this.resettable) {
			clearTimeout(this.timer);
		}
		this.timer = setTimeout(function() {
			this._service.setCharacteristic(Characteristic.On, false);
		}.bind(this), this.time);
	} else if (!on && this.reverse && !this.stateful) {
		if (this.resettable) {
			clearTimeout(this.timer);
		}
		this.timer = setTimeout(function() {
			this._service.setCharacteristic(Characteristic.On, true);
		}.bind(this), this.time);
	}
	
	if (this.stateful) {
	    this.storage.setItemSync(this.name, on);
	}
	
	callback();
}