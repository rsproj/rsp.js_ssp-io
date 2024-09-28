'use strict';

process.env.PM2_USAGE = 'CLI';

var cst          = require('../../constants.js');

var commander    = require('commander');
var chalk        = require('chalk');
var forEachLimit = require('async/forEachLimit');

var debug        = require('debug')('ssp:cli');
var PM2          = require('../API.js');
var pkg          = require('../../package.json');
var tabtab       = require('../completion.js');
var Common       = require('../Common.js');
var PM2ioHandler = require('../API/ssp-plus/PM2IO');


Common.determineSilentCLI();
Common.printVersion();

var ssp = new PM2();

PM2ioHandler.usePM2Client(ssp)

commander.version(pkg.version)
  .option('-v --version', 'print ssp version')
  .option('-s --silent', 'hide all messages', false)
  .option('--ext <extensions>', 'watch only this file extensions')
  .option('-n --name <name>', 'set a name for the process in the process list')
  .option('-m --mini-list', 'display a compacted list without formatting')
  .option('--interpreter <interpreter>', 'set a specific interpreter to use for executing app, default: node')
  .option('--interpreter-args <arguments>', 'set arguments to pass to the interpreter (alias of --node-args)')
  .option('--node-args <node_args>', 'space delimited arguments to pass to node')
  .option('-o --output <path>', 'specify log file for stdout')
  .option('-e --error <path>', 'specify log file for stderr')
  .option('-l --log [path]', 'specify log file which gathers both stdout and stderr')
  .option('--filter-env [envs]', 'filter out outgoing global values that contain provided strings', function(v, m) { m.push(v); return m;}, [])
  .option('--log-type <type>', 'specify log output style (raw by default, json optional)')
  .option('--log-date-format <date format>', 'add custom prefix timestamp to logs')
  .option('--time', 'enable time logging')
  .option('--disable-logs', 'disable all logs storage')
  .option('--env <environment_name>', 'specify which set of environment variables from ecosystem file must be injected')
  .option('-a --update-env', 'force an update of the environment with restart/reload (-a <=> apply)')
  .option('-f --force', 'force actions')
  .option('-i --instances <number>', 'launch [number] instances (for networked app)(load balanced)')
  .option('--parallel <number>', 'number of parallel actions (for restart/reload)')
  .option('--shutdown-with-message', 'shutdown an application with process.send(\'shutdown\') instead of process.kill(pid, SIGINT)')
  .option('-p --pid <pid>', 'specify pid file')
  .option('-k --kill-timeout <delay>', 'delay before sending final SIGKILL signal to process')
  .option('--listen-timeout <delay>', 'listen timeout on application reload')
  .option('--max-memory-restart <memory>', 'Restart the app if an amount of memory is exceeded (in bytes)')
  .option('--restart-delay <delay>', 'specify a delay between restarts (in milliseconds)')
  .option('--exp-backoff-restart-delay <delay>', 'specify a delay between restarts (in milliseconds)')
  .option('-x --execute-command', 'execute a program using fork system')
  .option('--max-restarts [count]', 'only restart the script COUNT times')
  .option('-u --user <username>', 'define user when generating startup script')
  .option('--uid <uid>', 'run target script with <uid> rights')
  .option('--gid <gid>', 'run target script with <gid> rights')
  .option('--namespace <ns>', 'start application within specified namespace')
  .option('--cwd <path>', 'run target script from path <cwd>')
  .option('--hp <home path>', 'define home path when generating startup script')
  .option('--wait-ip', 'override systemd script to wait for full internet connectivity to launch ssp')
  .option('--service-name <name>', 'define service name when generating startup script')
  .option('-c --cron <cron_pattern>', 'restart a running process based on a cron pattern')
  .option('-c --cron-restart <cron_pattern>', '(alias) restart a running process based on a cron pattern')
  .option('-w --write', 'write configuration in local folder')
  .option('--no-daemon', 'run ssp daemon in the foreground if it doesn\'t exist already')
  .option('--source-map-support', 'force source map support')
  .option('--only <application-name>', 'with json declaration, allow to only act on one application')
  .option('--disable-source-map-support', 'force source map support')
  .option('--wait-ready', 'ask ssp to wait for ready event from your app')
  .option('--merge-logs', 'merge logs from different instances but keep error and out separated')
  .option('--watch [paths]', 'watch application folder for changes', function(v, m) { m.push(v); return m;}, [])
  .option('--ignore-watch <folders|files>', 'List of paths to ignore (name or regex)')
  .option('--watch-delay <delay>', 'specify a restart delay after changing files (--watch-delay 4 (in sec) or 4000ms)')
  .option('--no-color', 'skip colors')
  .option('--no-vizion', 'start an app without vizion feature (versioning control)')
  .option('--no-autostart', 'add an app without automatic start')
  .option('--no-autorestart', 'start an app without automatic restart')
  .option('--stop-exit-codes <exit_codes...>', 'specify a list of exit codes that should skip automatic restart')
  .option('--no-treekill', 'Only kill the main process, not detached children')
  .option('--no-pmx', 'start an app without pmx')
  .option('--no-automation', 'start an app without pmx')
  .option('--trace', 'enable transaction tracing with km')
  .option('--disable-trace', 'disable transaction tracing with km')
  .option('--sort <field_name:sort>', 'sort process according to field\'s name')
  .option('--attach', 'attach logging after your start/restart/stop/reload')
  .option('--v8', 'enable v8 data collecting')
  .option('--event-loop-inspector', 'enable event-loop-inspector dump in pmx')
  .option('--deep-monitoring', 'enable all monitoring tools (equivalent to --v8 --event-loop-inspector --trace)')
  .usage('[cmd] app');

function displayUsage() {
  console.log('usage: ssp [options] <command>')
  console.log('');
  console.log('ssp -h, --help             all available commands and options');
  console.log('ssp examples               display ssp usage examples');
  console.log('ssp <command> -h           help on a specific command');
  console.log('');
  console.log('Access ssp files in ~/.ssp');
}

function displayExamples() {
  console.log('- Start and add a process to the ssp process list:')
  console.log('');
  console.log(chalk.cyan('  $ ssp start app.js --name app'));
  console.log('');
  console.log('- Show the process list:');
  console.log('');
  console.log(chalk.cyan('  $ ssp ls'));
  console.log('');
  console.log('- Stop and delete a process from the ssp process list:');
  console.log('');
  console.log(chalk.cyan('  $ ssp delete app'));
  console.log('');
  console.log('- Stop, start and restart a process from the process list:');
  console.log('');
  console.log(chalk.cyan('  $ ssp stop app'));
  console.log(chalk.cyan('  $ ssp start app'));
  console.log(chalk.cyan('  $ ssp restart app'));
  console.log('');
  console.log('- Clusterize an app to all CPU cores available:');
  console.log('');
  console.log(chalk.cyan('  $ ssp start -i max'));
  console.log('');
  console.log('- Update ssp :');
  console.log('');
  console.log(chalk.cyan('  $ npm install ssp -g && ssp update'));
  console.log('');
  console.log('- Install ssp auto completion:')
  console.log('');
  console.log(chalk.cyan('  $ ssp completion install'))
  console.log('');
  console.log('Check the full documentation on https://ssp.keymetrics.io/');
  console.log('');
}

function beginCommandProcessing() {
  ssp.getVersion(function(err, remote_version) {
    if (!err && (pkg.version != remote_version)) {
      console.log('');
      console.log(chalk.red.bold('>>>> In-memory PM2 is out-of-date, do:\n>>>> $ ssp update'));
      console.log('In memory PM2 version:', chalk.blue.bold(remote_version));
      console.log('Local PM2 version:', chalk.blue.bold(pkg.version));
      console.log('');
    }
  });
  commander.parse(process.argv);
}

function checkCompletion(){
  return tabtab.complete('ssp', function(err, data) {
    if(err || !data) return;
    if(/^--\w?/.test(data.last)) return tabtab.log(commander.options.map(function (data) {
      return data.long;
    }), data);
    if(/^-\w?/.test(data.last)) return tabtab.log(commander.options.map(function (data) {
      return data.short;
    }), data);
    // array containing commands after which process name should be listed
    var cmdProcess = ['stop', 'restart', 'scale', 'reload', 'delete', 'reset', 'pull', 'forward', 'backward', 'logs', 'describe', 'desc', 'show'];

    if (cmdProcess.indexOf(data.prev) > -1) {
      ssp.list(function(err, list){
        tabtab.log(list.map(function(el){ return el.name }), data);
        ssp.disconnect();
      });
    }
    else if (data.prev == 'ssp') {
      tabtab.log(commander.commands.map(function (data) {
        return data._name;
      }), data);
      ssp.disconnect();
    }
    else
      ssp.disconnect();
  });
};

var _arr = process.argv.indexOf('--') > -1 ? process.argv.slice(0, process.argv.indexOf('--')) : process.argv;

if (_arr.indexOf('log') > -1) {
  process.argv[_arr.indexOf('log')] = 'logs';
}

if (_arr.indexOf('--no-daemon') > -1) {
  //
  // Start daemon if it does not exist
  //
  // Function checks if --no-daemon option is present,
  // and starts daemon in the same process if it does not exist
  //
  console.log('ssp launched in no-daemon mode (you can add DEBUG="*" env variable to get more messages)');

  var sspNoDaeamon = new PM2({
    daemon_mode : false
  });

  sspNoDaeamon.connect(function() {
    ssp = sspNoDaeamon;
    beginCommandProcessing();
  });

}
else if (_arr.indexOf('startup') > -1 || _arr.indexOf('unstartup') > -1) {
  setTimeout(function() {
    commander.parse(process.argv);
  }, 100);
}
else {
  // HERE we instanciate the Client object
  ssp.connect(function() {
    debug('Now connected to daemon');
    if (process.argv.slice(2)[0] === 'completion') {
      checkCompletion();
      //Close client if completion related installation
      var third = process.argv.slice(3)[0];
      if ( third == null || third === 'install' || third === 'uninstall')
        ssp.disconnect();
    }
    else {
      beginCommandProcessing();
    }
  });
}

//
// Helper function to fail when unknown command arguments are passed
//
function failOnUnknown(fn) {
  return function(arg) {
    if (arguments.length > 1) {
      console.log(cst.PREFIX_MSG + '\nUnknown command argument: ' + arg);
      commander.outputHelp();
      process.exit(cst.ERROR_EXIT);
    }
    return fn.apply(this, arguments);
  };
}

/**
 * @todo to remove at some point once it's fixed in official commander.js
 * https://github.com/tj/commander.js/issues/475
 *
 * Patch Commander.js Variadic feature
 */
function patchCommanderArg(cmd) {
  var argsIndex;
  if ((argsIndex = commander.rawArgs.indexOf('--')) >= 0) {
    var optargs = commander.rawArgs.slice(argsIndex + 1);
    cmd = cmd.slice(0, cmd.indexOf(optargs[0]));
  }
  return cmd;
}

//
// Start command
//
commander.command('start [name|namespace|file|ecosystem|id...]')
  .option('--watch', 'Watch folder for changes')
  .option('--fresh', 'Rebuild Dockerfile')
  .option('--daemon', 'Run container in Daemon mode (debug purposes)')
  .option('--container', 'Start application in container mode')
  .option('--dist', 'with --container; change local Dockerfile to containerize all files in current directory')
  .option('--image-name [name]', 'with --dist; set the exported image name')
  .option('--node-version [major]', 'with --container, set a specific major Node.js version')
  .option('--dockerdaemon', 'for debugging purpose')
  .description('start and daemonize an app')
  .action(function(cmd, opts) {
    if (opts.container == true && opts.dist == true)
      return ssp.dockerMode(cmd, opts, 'distribution');
    else if (opts.container == true)
      return ssp.dockerMode(cmd, opts, 'development');

    if (cmd == "-") {
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', function (cmd) {
        process.stdin.pause();
        ssp._startJson(cmd, commander, 'restartProcessId', 'pipe');
      });
    }
    else {
      // Commander.js patch
      cmd = patchCommanderArg(cmd);
      if (cmd.length === 0) {
        cmd = [cst.APP_CONF_DEFAULT_FILE];
      }
      let acc = []
      forEachLimit(cmd, 1, function(script, next) {
        ssp.start(script, commander, (err, apps) => {
          acc = acc.concat(apps)
          next(err)
        });
      }, function(err, dt) {
        if (err && err.message &&
            (err.message.includes('Script not found') === true ||
             err.message.includes('NOT AVAILABLE IN PATH') === true)) {
          ssp.exitCli(1)
        }
        else
          ssp.speedList(err ? 1 : 0, acc);
      });
    }
  });

commander.command('trigger <id|proc_name|namespace|all> <action_name> [params]')
  .description('trigger process action')
  .action(function(pm_id, action_name, params) {
    ssp.trigger(pm_id, action_name, params);
  });

commander.command('deploy <file|environment>')
  .description('deploy your json')
  .action(function(cmd) {
    ssp.deploy(cmd, commander);
  });

commander.command('startOrRestart <json>')
  .description('start or restart JSON file')
  .action(function(file) {
    ssp._startJson(file, commander, 'restartProcessId');
  });

commander.command('startOrReload <json>')
  .description('start or gracefully reload JSON file')
  .action(function(file) {
    ssp._startJson(file, commander, 'reloadProcessId');
  });

commander.command('pid [app_name]')
  .description('return pid of [app_name] or all')
  .action(function(app) {
    ssp.getPID(app);
  });

commander.command('create')
  .description('return pid of [app_name] or all')
  .action(function() {
    ssp.boilerplate()
  });

commander.command('startOrGracefulReload <json>')
  .description('start or gracefully reload JSON file')
  .action(function(file) {
    ssp._startJson(file, commander, 'reloadProcessId');
  });

//
// Stop specific id
//
commander.command('stop <id|name|namespace|all|json|stdin...>')
  .option('--watch', 'Stop watching folder for changes')
  .description('stop a process')
  .action(function(param) {
    forEachLimit(param, 1, function(script, next) {
      ssp.stop(script, next);
    }, function(err) {
      ssp.speedList(err ? 1 : 0);
    });
  });

//
// Stop All processes
//
commander.command('restart <id|name|namespace|all|json|stdin...>')
  .option('--watch', 'Toggle watching folder for changes')
  .description('restart a process')
  .action(function(param) {
    // Commander.js patch
    param = patchCommanderArg(param);
    let acc = []
    forEachLimit(param, 1, function(script, next) {
      ssp.restart(script, commander, (err, apps) => {
        acc = acc.concat(apps)
        next(err)
      });
    }, function(err) {
      ssp.speedList(err ? 1 : 0, acc);
    });
  });

//
// Scale up/down a process in cluster mode
//
commander.command('scale <app_name> <number>')
  .description('scale up/down a process in cluster mode depending on total_number param')
  .action(function(app_name, number) {
    ssp.scale(app_name, number);
  });

//
// snapshot PM2
//
commander.command('profile:mem [time]')
  .description('Sample PM2 heap memory')
  .action(function(time) {
    ssp.profile('mem', time);
  });

//
// snapshot PM2
//
commander.command('profile:cpu [time]')
  .description('Profile PM2 cpu')
  .action(function(time) {
    ssp.profile('cpu', time);
  });

//
// Reload process(es)
//
commander.command('reload <id|name|namespace|all>')
  .description('reload processes (note that its for app using HTTP/HTTPS)')
  .action(function(ssp_id) {
    ssp.reload(ssp_id, commander);
  });

commander.command('id <name>')
  .description('get process id by name')
  .action(function(name) {
    ssp.getProcessIdByName(name);
  });

// Inspect a process
commander.command('inspect <name>')
  .description('inspect a process')
  .action(function(cmd) {
    ssp.inspect(cmd, commander);
  });

//
// Stop and delete a process by name from database
//
commander.command('delete <name|id|namespace|script|all|json|stdin...>')
  .alias('del')
  .description('stop and delete a process from ssp process list')
  .action(function(name) {
    if (name == "-") {
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', function (param) {
        process.stdin.pause();
        ssp.delete(param, 'pipe');
      });
    } else
      forEachLimit(name, 1, function(script, next) {
        ssp.delete(script,'', next);
      }, function(err) {
        ssp.speedList(err ? 1 : 0);
      });
  });

//
// Send system signal to process
//
commander.command('sendSignal <signal> <ssp_id|name>')
  .description('send a system signal to the target process')
  .action(function(signal, ssp_id) {
    if (isNaN(parseInt(ssp_id))) {
      console.log(cst.PREFIX_MSG + 'Sending signal to process name ' + ssp_id);
      ssp.sendSignalToProcessName(signal, ssp_id);
    } else {
      console.log(cst.PREFIX_MSG + 'Sending signal to process id ' + ssp_id);
      ssp.sendSignalToProcessId(signal, ssp_id);
    }
  });

//
// Stop and delete a process by name from database
//
commander.command('ping')
  .description('ping ssp daemon - if not up it will launch it')
  .action(function() {
    ssp.ping();
  });

commander.command('updatePM2')
  .description('update in-memory PM2 with local PM2')
  .action(function() {
    ssp.update();
  });
commander.command('update')
  .description('(alias) update in-memory PM2 with local PM2')
  .action(function() {
    ssp.update();
  });

/**
 * Module specifics
 */
commander.command('install <module|git:// url>')
  .alias('module:install')
  .option('--tarball', 'is local tarball')
  .option('--install', 'run yarn install before starting module')
  .option('--docker', 'is docker container')
  .option('--v1', 'install module in v1 manner (do not use it)')
  .option('--safe [time]', 'keep module backup, if new module fail = restore with previous')
  .description('install or update a module and run it forever')
  .action(function(plugin_name, opts) {
    require('util')._extend(commander, opts);
    ssp.install(plugin_name, commander);
  });

commander.command('module:update <module|git:// url>')
  .description('update a module and run it forever')
  .action(function(plugin_name) {
    ssp.install(plugin_name);
  });


commander.command('module:generate [app_name]')
  .description('Generate a sample module in current folder')
  .action(function(app_name) {
    ssp.generateModuleSample(app_name);
  });

commander.command('uninstall <module>')
  .alias('module:uninstall')
  .description('stop and uninstall a module')
  .action(function(plugin_name) {
    ssp.uninstall(plugin_name);
  });

commander.command('package [target]')
  .description('Check & Package TAR type module')
  .action(function(target) {
    ssp.package(target);
  });

commander.command('publish [folder]')
  .option('--npm', 'publish on npm')
  .alias('module:publish')
  .description('Publish the module you are currently on')
  .action(function(folder, opts) {
    ssp.publish(folder, opts);
  });

commander.command('set [key] [value]')
  .description('sets the specified config <key> <value>')
  .action(function(key, value) {
    ssp.set(key, value);
  });

commander.command('multiset <value>')
  .description('multiset eg "key1 val1 key2 val2')
  .action(function(str) {
    ssp.multiset(str);
  });

commander.command('get [key]')
  .description('get value for <key>')
  .action(function(key) {
    ssp.get(key);
  });

commander.command('conf [key] [value]')
  .description('get / set module config values')
  .action(function(key, value) {
    ssp.get()
  });

commander.command('config <key> [value]')
  .description('get / set module config values')
  .action(function(key, value) {
    ssp.conf(key, value);
  });

commander.command('unset <key>')
  .description('clears the specified config <key>')
  .action(function(key) {
    ssp.unset(key);
  });

commander.command('report')
  .description('give a full ssp report for https://github.com/Unitech/ssp/issues')
  .action(function(key) {
    ssp.report();
  });

//
// PM2 I/O
//
commander.command('link [secret] [public] [name]')
  .option('--info-node [url]', 'set url info node')
  .description('link with the ssp monitoring dashboard')
  .action(ssp.linkManagement.bind(ssp));

commander.command('unlink')
  .description('unlink with the ssp monitoring dashboard')
  .action(function() {
    ssp.unlink();
  });

commander.command('monitor [name]')
  .description('monitor target process')
  .action(function(name) {
    if (name === undefined) {
      return plusHandler()
    }
    ssp.monitorState('monitor', name);
  });

commander.command('unmonitor [name]')
  .description('unmonitor target process')
  .action(function(name) {
    ssp.monitorState('unmonitor', name);
  });

commander.command('open')
  .description('open the ssp monitoring dashboard')
  .action(function(name) {
    ssp.openDashboard();
  });

function plusHandler (command, opts) {
  if (opts && opts.infoNode) {
    process.env.KEYMETRICS_NODE = opts.infoNode
  }

  return PM2ioHandler.launch(command, opts)
}

commander.command('plus [command] [option]')
  .alias('register')
  .option('--info-node [url]', 'set url info node for on-premise ssp plus')
  .option('-d --discrete', 'silent mode')
  .option('-a --install-all', 'install all modules (force yes)')
  .description('enable ssp plus')
  .action(plusHandler);

commander.command('login')
  .description('Login to ssp plus')
  .action(function() {
    return plusHandler('login')
  });

commander.command('logout')
  .description('Logout from ssp plus')
  .action(function() {
    return plusHandler('logout')
  });

//
// Save processes to file
//
commander.command('dump')
  .alias('save')
  .option('--force', 'force deletion of dump file, even if empty')
  .description('dump all processes for resurrecting them later')
  .action(failOnUnknown(function(opts) {
    ssp.dump(commander.force)
  }));

//
// Delete dump file
//
commander.command('cleardump')
  .description('Create empty dump file')
  .action(failOnUnknown(function() {
    ssp.clearDump();
  }));

//
// Save processes to file
//
commander.command('send <pm_id> <line>')
  .description('send stdin to <pm_id>')
  .action(function(pm_id, line) {
    ssp.sendLineToStdin(pm_id, line);
  });

//
// Attach to stdin/stdout
// Not TTY ready
//
commander.command('attach <pm_id> [command separator]')
  .description('attach stdin/stdout to application identified by <pm_id>')
  .action(function(pm_id, separator) {
    ssp.attach(pm_id, separator);
  });

//
// Resurrect
//
commander.command('resurrect')
  .description('resurrect previously dumped processes')
  .action(failOnUnknown(function() {
    console.log(cst.PREFIX_MSG + 'Resurrecting');
    ssp.resurrect();
  }));

//
// Set ssp to startup
//
commander.command('unstartup [platform]')
  .description('disable the ssp startup hook')
  .action(function(platform) {
    ssp.uninstallStartup(platform, commander);
  });

//
// Set ssp to startup
//
commander.command('startup [platform]')
  .description('enable the ssp startup hook')
  .action(function(platform) {
    ssp.startup(platform, commander);
  });

//
// Logrotate
//
commander.command('logrotate')
  .description('copy default logrotate configuration')
  .action(function(cmd) {
    ssp.logrotate(commander);
  });

//
// Sample generate
//

commander.command('ecosystem [mode]')
  .alias('init')
  .description('generate a process conf file. (mode = null or simple)')
  .action(function(mode) {
    ssp.generateSample(mode);
  });

commander.command('reset <name|id|all>')
  .description('reset counters for process')
  .action(function(proc_id) {
    ssp.reset(proc_id);
  });

commander.command('describe <name|id>')
  .description('describe all parameters of a process')
  .action(function(proc_id) {
    ssp.describe(proc_id);
  });

commander.command('desc <name|id>')
  .description('(alias) describe all parameters of a process')
  .action(function(proc_id) {
    ssp.describe(proc_id);
  });

commander.command('info <name|id>')
  .description('(alias) describe all parameters of a process')
  .action(function(proc_id) {
    ssp.describe(proc_id);
  });

commander.command('show <name|id>')
  .description('(alias) describe all parameters of a process')
  .action(function(proc_id) {
    ssp.describe(proc_id);
  });

commander.command('env <id>')
  .description('list all environment variables of a process id')
  .action(function(proc_id) {
    ssp.env(proc_id);
  });

//
// List command
//
commander
  .command('list')
  .alias('ls')
  .description('list all processes')
  .action(function() {
    ssp.list(commander)
  });

commander.command('l')
  .description('(alias) list all processes')
  .action(function() {
    ssp.list()
  });

commander.command('ps')
  .description('(alias) list all processes')
  .action(function() {
    ssp.list()
  });

commander.command('status')
  .description('(alias) list all processes')
  .action(function() {
    ssp.list()
  });


// List in raw json
commander.command('jlist')
  .description('list all processes in JSON format')
  .action(function() {
    ssp.jlist()
  });

commander.command('sysmonit')
  .description('start system monitoring daemon')
  .action(function() {
    ssp.launchSysMonitoring()
  })

commander.command('slist')
  .alias('sysinfos')
  .option('-t --tree', 'show as tree')
  .description('list system infos in JSON')
  .action(function(opts) {
    ssp.slist(opts.tree)
  })

// List in prettified Json
commander.command('prettylist')
  .description('print json in a prettified JSON')
  .action(failOnUnknown(function() {
    ssp.jlist(true);
  }));

//
// Dashboard command
//
commander.command('monit')
  .description('launch termcaps monitoring')
  .action(function() {
    ssp.dashboard();
  });

commander.command('imonit')
  .description('launch legacy termcaps monitoring')
  .action(function() {
    ssp.monit();
  });

commander.command('dashboard')
  .alias('dash')
  .description('launch dashboard with monitoring and logs')
  .action(function() {
    ssp.dashboard();
  });


//
// Flushing command
//

commander.command('flush [api]')
.description('flush logs')
.action(function(api) {
  ssp.flush(api);
});

/* old version
commander.command('flush')
  .description('flush logs')
  .action(failOnUnknown(function() {
    ssp.flush();
  }));
*/
//
// Reload all logs
//
commander.command('reloadLogs')
  .description('reload all logs')
  .action(function() {
    ssp.reloadLogs();
  });

//
// Log streaming
//
commander.command('logs [id|name|namespace]')
  .option('--json', 'json log output')
  .option('--format', 'formated log output')
  .option('--raw', 'raw output')
  .option('--err', 'only shows error output')
  .option('--out', 'only shows standard output')
  .option('--lines <n>', 'output the last N lines, instead of the last 15 by default')
  .option('--timestamp [format]', 'add timestamps (default format YYYY-MM-DD-HH:mm:ss)')
  .option('--nostream', 'print logs without launching the log stream')
  .option('--highlight [value]', 'highlights the given value')
  .description('stream logs file. Default stream all logs')
  .action(function(id, cmd) {
    var Logs = require('../API/Log.js');

    if (!id) id = 'all';

    var line = 15;
    var raw  = false;
    var exclusive = false;
    var timestamp = false;
    var highlight = false;

    if(!isNaN(parseInt(cmd.lines))) {
      line = parseInt(cmd.lines);
    }

    if (cmd.parent.rawArgs.indexOf('--raw') !== -1)
      raw = true;

    if (cmd.timestamp)
      timestamp = typeof cmd.timestamp === 'string' ? cmd.timestamp : 'YYYY-MM-DD-HH:mm:ss';

    if (cmd.highlight)
      highlight = typeof cmd.highlight === 'string' ? cmd.highlight : false;

    if (cmd.out === true)
      exclusive = 'out';

    if (cmd.err === true)
      exclusive = 'err';

    if (cmd.nostream === true)
      ssp.printLogs(id, line, raw, timestamp, exclusive);
    else if (cmd.json === true)
      Logs.jsonStream(ssp.Client, id);
    else if (cmd.format === true)
      Logs.formatStream(ssp.Client, id, false, 'YYYY-MM-DD-HH:mm:ssZZ', exclusive, highlight);
    else
      ssp.streamLogs(id, line, raw, timestamp, exclusive, highlight);
  });


//
// Kill
//
commander.command('kill')
  .description('kill daemon')
  .action(failOnUnknown(function(arg) {
    ssp.killDaemon(function() {
      process.exit(cst.SUCCESS_EXIT);
    });
  }));

//
// Update repository for a given app
//

commander.command('pull <name> [commit_id]')
  .description('updates repository for a given app')
  .action(function(ssp_name, commit_id) {

    if (commit_id !== undefined) {
      ssp._pullCommitId({
        ssp_name: ssp_name,
        commit_id: commit_id
      });
    }
    else
      ssp.pullAndRestart(ssp_name);
  });

//
// Update repository to the next commit for a given app
//
commander.command('forward <name>')
  .description('updates repository to the next commit for a given app')
  .action(function(ssp_name) {
    ssp.forward(ssp_name);
  });

//
// Downgrade repository to the previous commit for a given app
//
commander.command('backward <name>')
  .description('downgrades repository to the previous commit for a given app')
  .action(function(ssp_name) {
    ssp.backward(ssp_name);
  });

//
// Perform a deep update of PM2
//
commander.command('deepUpdate')
  .description('performs a deep update of PM2')
  .action(function() {
    ssp.deepUpdate();
  });

//
// Launch a http server that expose a given path on given port
//
commander.command('serve [path] [port]')
  .alias('expose')
  .option('--port [port]', 'specify port to listen to')
  .option('--spa', 'always serving index.html on inexistant sub path')
  .option('--basic-auth-username [username]', 'set basic auth username')
  .option('--basic-auth-password [password]', 'set basic auth password')
  .option('--monitor [frontend-app]', 'frontend app monitoring (auto integrate snippet on html files)')
  .description('serve a directory over http via port')
  .action(function (path, port, cmd) {
    ssp.serve(path, port || cmd.port, cmd, commander);
  });

commander.command('autoinstall')
  .action(function() {
    ssp.autoinstall()
  })

commander.command('examples')
  .description('display ssp usage examples')
  .action(() => {
    console.log(cst.PREFIX_MSG + chalk.grey('ssp usage examples:\n'));
    displayExamples();
    process.exit(cst.SUCCESS_EXIT);
  })

//
// Catch all
//
commander.command('*')
  .action(function() {
    console.log(cst.PREFIX_MSG_ERR + chalk.bold('Command not found\n'));
    displayUsage();
    // Check if it does not forget to close fds from RPC
    process.exit(cst.ERROR_EXIT);
  });

//
// Display help if 0 arguments passed to ssp
//
if (process.argv.length == 2) {
  commander.parse(process.argv);
  displayUsage();
  // Check if it does not forget to close fds from RPC
  process.exit(cst.ERROR_EXIT);
}