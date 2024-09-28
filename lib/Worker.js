/**
 * Copyright 2013-2022 the PM2 project authors. All rights reserved.
 * Use of this source code is governed by a license that
 * can be found in the LICENSE file.
 */
const vizion    = require('vizion');
const eachLimit = require('async/eachLimit');
const debug     = require('debug')('ssp:worker');
const domain    = require('domain');
const Cron      = require('croner');
const pkg       = require('../package.json');

var cst    = require('../constants.js');
var vCheck = require('./VersionCheck.js')

module.exports = function(God) {
  var timer = null;

  God.CronJobs = new Map();
  God.Worker = {};
  God.Worker.is_running = false;

  God.getCronID = function(pm_id) {
    return `cron-${pm_id}`
  }

  God.registerCron = function(ssp_env) {
    if (!ssp_env ||
        ssp_env.pm_id === undefined ||
        !ssp_env.cron_restart ||
        ssp_env.cron_restart == '0' ||
        God.CronJobs.has(God.getCronID(ssp_env.pm_id)))
      return;

    var pm_id = ssp_env.pm_id
    console.log('[PM2][WORKER] Registering a cron job on:', pm_id);

    var job = Cron(ssp_env.cron_restart, function() {
      God.restartProcessId({id: pm_id}, function(err, data) {
        if (err)
          console.error(err.stack || err);
        return;
      });
    });

    God.CronJobs.set(God.getCronID(pm_id), job);
  }


  /**
   * Deletes the cron job on deletion of process
   */
  God.deleteCron = function(id) {
    if (typeof(id) !== 'undefined' && God.CronJobs.has(God.getCronID(id)) === false)
      return;
    console.log('[PM2] Deregistering a cron job on:', id);
    var job = God.CronJobs.get(God.getCronID(id));

    if (job)
      job.stop();

    God.CronJobs.delete(God.getCronID(id));
  };

  var _getProcessById = function(pm_id) {
    var proc = God.clusters_db[pm_id];
    return proc ? proc : null;
  };


  var maxMemoryRestart = function(proc_key, cb) {
    var proc = _getProcessById(proc_key.ssp_env.pm_id);

    if (!(proc &&
          proc.ssp_env &&
          proc_key.monit))
      return cb();

    if (proc_key.monit.memory !== undefined &&
        proc.ssp_env.max_memory_restart !== undefined &&
        proc.ssp_env.max_memory_restart < proc_key.monit.memory &&
        proc.ssp_env.axm_options &&
        proc.ssp_env.axm_options.pid === undefined) {
      console.log('[PM2][WORKER] Process %s restarted because it exceeds --max-memory-restart value (current_memory=%s max_memory_limit=%s [octets])', proc.ssp_env.pm_id, proc_key.monit.memory, proc.ssp_env.max_memory_restart);
      God.reloadProcessId({
        id : proc.ssp_env.pm_id
      }, function(err, data) {
        if (err)
          console.error(err.stack || err);
        return cb();
      });
    }
    else {
      return cb();
    }
  };

  // Deprecated
  var versioningRefresh = function(proc_key, cb) {
    var proc = _getProcessById(proc_key.ssp_env.pm_id);
    if (!(proc &&
          proc.ssp_env &&
          (proc.ssp_env.vizion !== false && proc.ssp_env.vizion != "false") &&
          proc.ssp_env.versioning &&
          proc.ssp_env.versioning.repo_path)) {
      return cb();
    }

    if (proc.ssp_env.vizion_running === true)
    {
      debug('Vizion is already running for proc id: %d, skipping this round', proc.ssp_env.pm_id);
      return cb();
    }

    proc.ssp_env.vizion_running = true;
    var repo_path = proc.ssp_env.versioning.repo_path;

    vizion.analyze({
      folder: proc.ssp_env.versioning.repo_path
    },
    function(err, meta) {
      if (err != null)
        return cb();

      proc = _getProcessById(proc_key.ssp_env.pm_id);

      if (!(proc &&
            proc.ssp_env &&
            proc.ssp_env.versioning &&
            proc.ssp_env.versioning.repo_path)) {
        console.error('Proc not defined anymore or versioning unknown');
        return cb();
      }

      proc.ssp_env.vizion_running = false;
      meta.repo_path = repo_path;
      proc.ssp_env.versioning = meta;
      debug('[PM2][WORKER] %s parsed for versioning', proc.ssp_env.name);
      return cb();
    });
  };

  var tasks = function() {
    if (God.Worker.is_running === true) {
      debug('[PM2][WORKER] Worker is already running, skipping this round');
      return false;
    }
    God.Worker.is_running = true;

    God.getMonitorData(null, function(err, data) {
      if (err || !data || typeof(data) !== 'object') {
        God.Worker.is_running = false;
        return console.error(err);
      }

      eachLimit(data, 1, function(proc, next) {
        if (!proc || !proc.ssp_env || proc.ssp_env.pm_id === undefined)
          return next();

        debug('[PM2][WORKER] Processing proc id:', proc.ssp_env.pm_id);

        // Reset restart delay if application has an uptime of more > 30secs
        if (proc.ssp_env.exp_backoff_restart_delay !== undefined &&
            proc.ssp_env.prev_restart_delay && proc.ssp_env.prev_restart_delay > 0) {
          var app_uptime = Date.now() - proc.ssp_env.pm_uptime
          if (app_uptime > cst.EXP_BACKOFF_RESET_TIMER) {
            var ref_proc = _getProcessById(proc.ssp_env.pm_id);
            ref_proc.ssp_env.prev_restart_delay = 0
            console.log(`[PM2][WORKER] Reset the restart delay, as app ${proc.name} has been up for more than ${cst.EXP_BACKOFF_RESET_TIMER}ms`)
          }
        }

        // Check if application has reached memory threshold
        maxMemoryRestart(proc, function() {
          return next();
        });
      }, function(err) {
        God.Worker.is_running = false;
        debug('[PM2][WORKER] My job here is done, next job in %d seconds', parseInt(cst.WORKER_INTERVAL / 1000));
      });
    });
  };

  var wrappedTasks = function() {
    var d = domain.create();

    d.once('error', function(err) {
      console.error('[PM2][WORKER] Error caught by domain:\n' + (err.stack || err));
      God.Worker.is_running = false;
    });

    d.run(function() {
      tasks();
    });
  };


  God.Worker.start = function() {
    timer = setInterval(wrappedTasks, cst.WORKER_INTERVAL);

    setInterval(() => {
      vCheck({
        state: 'check',
        version: pkg.version
      })
    }, 1000 * 60 * 60 * 24)
  };

  God.Worker.stop = function() {
    if (timer !== null)
      clearInterval(timer);
  };
};