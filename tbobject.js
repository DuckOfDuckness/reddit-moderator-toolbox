(function tbobject() {

TB = {
    utils: TBUtils,
    ui: TBui,

    modules: {},
    moduleList: [],

    register_module: function register_module(module) {
        this.moduleList.push(module.shortname);
        this.modules[module.shortname] = module;
    },

    init: function init() {
        // call every module's init() method on page load
        for (var i=0; i < this.moduleList.length; i++) {
            var module = this.modules[this.moduleList[i]];

            // Don't do anything with beta modules unless beta mode is enabled
            // Need TB.setting() call for non-module settings
            // if (!TB.setting('betamode') && module.setting('betamode')) {
            if (!TB.utils.getSetting('Utils', 'betaMode', false)
                && module.setting('betamode')
            ) {
                // skip this module entirely
                continue;
            }
            // Don't do anything with dev modules unless debug mode is enabled
            // Need TB.setting() call for non-module settings
            // if (!TB.setting('betamode') && module.setting('betamode')) {
            if (!TB.utils.getSetting('Utils', 'debugMode', false)
                && module.setting('devmode')
            ) {
                // skip this module entirely
                continue;
            }

            // lock 'n load
            if (module.setting('enabled')) {
                $.log('Loading ' + module.name + ' module.');
                module.init();
            }

        }
    },

    injectSettings: function injectSettings() {
        for (var i=0; i < this.moduleList.length; i++) {
            var idx = i,
                self = this;

            (function () {
                // wrap each iteration in a self-executing anonymous function, to preserve scope for bindFirst()
                // otherwise, we get the bindFirst callback having `var module` refer to the last time it was set
                // becausde we're in for loop not a special scope, d'oh.
                var module = self.modules[self.moduleList[idx]];

                // Don't do anything with beta modules unless beta mode is enabled
                // Need TB.setting() call for non-module settings
                // if (!TB.setting('betamode') && module.setting('betamode')) {
                if (!TB.utils.getSetting('Utils', 'betaMode', false)
                    && module.setting('betamode')
                ) {
                    // skip this module entirely
                    // use `return false` because we're in a self-executing anonymous function
                    return false;
                }
                // Don't do anything with dev modules unless debug mode is enabled
                // Need TB.setting() call for non-module settings
                // if (!TB.setting('betamode') && module.setting('betamode')) {
                if (!TB.utils.getSetting('Utils', 'debugMode', false)
                    && module.setting('devmode')
                ) {
                    // skip this module entirely
                    // use `return false` because we're in a self-executing anonymous function
                    return false;
                }


                //
                // build and inject our settings tab
                //

                var $tab = $('<a href="javascript:;" class="tb-window-content-'+module.shortname.toLowerCase()+'">'+module.name+'</a>'),
                    $settings = $('<div class="tb-window-content-'+module.shortname.toLowerCase()+'" style="display: none;"><div class="tb-help-main-content"></div></div>');

                for (var i=0; i < module.settingsList.length; i++) {
                    var setting = module.settingsList[i],
                        options = module.settings[setting];

                    // "enabled" will eventually be special, but for now it just shows up like any other setting
                    // if (setting == "enabled") {
                    //     continue;
                    // }

                    // "enabled" is special during the transition period, while the "Toggle Modules" tab still exists
                    if (setting == "enabled") {
                        // blank slate
                        var $setting = $('<p></p>');
                        $setting.append($('<label><input type="checkbox" id="'+module.shortname+'Enabled" '+(module.setting(setting) ? ' checked="checked"' : '')+'> '+options.title+'</label>'));

                        $('.tb-window-content .tb-window-content-modules').append($setting);

                        // don't need this on the module's tab, too
                        continue;
                    }

                    // hide beta stuff unless beta mode enabled
                    if (options.hasOwnProperty("betamode")
                        && !TB.utils.getSetting('Utils', 'betaMode', false)
                        && options["betamode"]
                    ) {
                        continue;
                    }
                    // hide dev stuff unless debug mode enabled
                    if (options.hasOwnProperty("devmode")
                        && !TB.utils.getSetting('Utils', 'debugMode', false)
                        && options["devmode"]
                    ) {
                        continue;
                    }

                    // hide hidden settings, ofc
                    if (options.hasOwnProperty("hidden")
                        && options["hidden"]
                    ) {
                        continue;
                    }

                    // blank slate
                    var $setting = $('<p></p>');

                    // automagical handling of input ypes
                    switch (options.type) {
                        case "boolean":
                            $setting.append($('<label><input type="checkbox" '+(module.setting(setting) ? ' checked="checked"' : '')+'> '+options.title+'</label>'));
                            break;
                        case "text":
                        case "list":
                            $setting.append(options.title+'<br />');
                            $setting.append($('<input type="text" value="'+module.setting(setting)+'">'));
                            break;
                        case "number":
                            $setting.append(options.title+': <input type="number" value="'+module.setting(setting)+'">');
                            break;
                        default:
                            // what in the world would we do here? maybe raw JSON?
                            break;
                    }
                    $setting.attr('id', 'tb-'+module.shortname+'-'+setting);
                    $setting.find('input').data('module', module.shortname);
                    $setting.find('input').data('setting', setting);

                    $settings.append($setting);
                }

                if ($settings.find('input').length > 0) {
                    // attach tab and content
                    $('.tb-settings .tb-window-tabs a:nth-last-child(1)').before($tab);
                    $('.tb-settings .tb-window-content').append($settings);
                } else {
                    // module has no settings, for now don't inject a tab
                }


                // we use a jQuery hack to stick this bind call at the top of the queue,
                // so that it runs before the bind call in notifier.js
                // this way we don't have to touch notifier.js to make it work.
                //
                // We get one additional click handler for each module that gets injected.
                $('body').bindFirst('click', '.tb-save', function (event) {
                    // handle module enable/disable on Toggle Modules first
                    var $moduleEnabled = $('.tb-window-content .tb-window-content-modules #'+module.shortname+'Enabled').prop('checked');
                    module.setting('enabled', $moduleEnabled);

                    // handle the regular settings tab
                    var $settings_page = $('.tb-window-content-'+module.shortname.toLowerCase());

                    $settings_page.find('input').each(function () {
                        var $this = $(this),
                            value = '';

                        // automagically parse input types
                        switch (module.settings[$this.data('setting')].type) {
                            case 'boolean':
                                value = $this.prop('checked');
                                break;
                            case 'list':
                                value = $this.val().split(',').map(function (str) { return str.trim(); });
                                break;
                            default:
                                value = JSON.parse($this.val());
                                break;
                        }

                        module.setting($this.data('setting'), value);
                    });
                });
            }());
        }
    }
};

// Prototype for all Toolbox modules
TB.Module = function Module(name) {
    // PUBLIC: Module Metadata
    this.name = name;
    this.__defineGetter__('shortname', function () {
        // return name.trim().toLowerCase().replace(' ', '_');
        return name.trim().replace(' ', '');
    });

    this.settings = {};
    this.settingsList = [];

    this.register_setting = function register_setting(name, setting) {
        this.settingsList.push(name);
        this.settings[name] = setting;
    };

    this.register_setting(
        "enabled", { // this one serves as an example as well as the absolute minimum setting that every module has
            "type": "boolean",
            "default": false,
            "betamode": false, // optional
            "hidden": false, // optional
            "title": "Enable " + this.name + "."
        });
    this.register_setting(
        "betamode", {
            "type": "boolean",
            "default": true,
            "hidden": true
        });
    this.register_setting(
        "devmode", {
            "type": "boolean",
            "default": false,
            "hidden": true
        });

    // PUBLIC: settings interface
    this.setting = function setting(name, value) {
        // are we setting or getting?
        if (typeof value !== "undefined") {
            // setting
            return TB.utils.setSetting(this.shortname, name, value);
        } else {
            // getting
            // do we have a default?
            if (this.settings.hasOwnProperty(name)
                && this.settings[name].hasOwnProperty("default")
            ) {
                // we know what the default should be
                return TB.utils.getSetting(this.shortname, name, this.settings[name]["default"])
            } else {
                // getSetting defaults to null for default value, no need to pass it explicitly
                return TB.utils.getSetting(this.shortname, name);
            }
        }
    };

    // PUBLIC: placeholder init(), just in case
    this.init = function init() {
        // pass
    };
}


// This needs to be called last. There's probably some clever way to do it, but I haven't figured it out.
// TB.init();

})();