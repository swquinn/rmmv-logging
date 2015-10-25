/*!
 * Copyright (c) 2015 Extesla, LLC.
 *
 * Licensed under the MIT License (http://opensource.org/licenses/MIT)
 *
 * Permission is hereby granted, free of charge, to any
 * person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished
 * to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice
 * shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
 * KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT
 * OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

//=============================================================================
// Logging.js
//=============================================================================

var Logging = Logging || {};

var LogLevel = LogLevel || {};

/*:
 * @plugindesc Adds logging functionality to the game.
 * @author Sean Quinn
 *
 * @param Log Level
 * @desc The logging level, e.g. DEBUG, INFO, WARN, ERROR
 * @default INFO
 *
 * @param Enable Console Logger
 * @desc Enable/disable console logging
 * @default True
 *
 * @param Enable File Logger
 * @desc Enable/disable file logging
 * @default True
 *
 * @param Log Filename
 * @desc The name of the log file.
 * @default game.log
 *
 * @param Log Directory
 * @desc The relative path for your logs
 * @default logs
 *
 * @help
 *
 */
(function() {

  "use strict"; // ;_;

  var fs = require("fs");
  var path = require("path");
  var util = require("util");

  // ===========================================================================
  // LogLevel
  // ===========================================================================

  LogLevel.DEBUG = 10;
  LogLevel.INFO = 20;
  LogLevel.WARN = 30;
  LogLevel.WARNING = LogLevel.WARN;
  LogLevel.ERROR = 40;
  LogLevel.ALL = 0;

  function _levelToName(level) {
    if (level === LogLevel.ALL) {
      return "ALL";
    }
    else if (level === LogLevel.DEBUG) {
      return "DEBUG";
    }
    else if (level === LogLevel.ERROR) {
      return "ERROR";
    }
    else if (level === LogLevel.INFO) {
      return "INFO";
    }
    else if (level === LogLevel.WARN) {
      return "WARN";
    }
    throw Error("Unknown level: " + level);
  }

  function _nameToLevel(level) {
    var map = {
      "ALL": LogLevel.ALL,
      "DEBUG": LogLevel.DEBUG,
      "ERROR": LogLevel.ERROR,
      "INFO": LogLevel.INFO,
      "WARN": LogLevel.WARN,
      "WARNING": LogLevel.WARNING
    };
    return map[level];
  }

  function _checkLevel(level) {
    var rv = null;
    if (typeof level === "number") {
      rv = level;
    }
    else if (typeof level === "string") {
      rv = _nameToLevel(level);
    }
    else {
      throw Error("Level " + level + " unrecognized.");
    }
    return rv;
  }

  /**
   * Return the textual representation of logging level "level".
   *
   * If the level is one of the predefined levels (ERROR, WARNING, INFO, DEBUG)
   * then you get the corresponding string.
   *
   * If a numeric value corresponding to one of the defined levels is passed
   * in, the corresponding string representation is returned.
   */
  function _getLevelName(level) {
    var lvl = null;

    lvl = _levelToName(level);
    if (!lvl) {
      lvl = _nameToLevel(level);
    }
    return lvl;
  }


  // ===========================================================================
  // Logging
  // ===========================================================================

  // ** Plugin state constants.
  Logging.STATE_DONE                = "done";
  Logging.STATE_ERR                 = "err";
  Logging.STATE_INITIALIZING        = "initializing";
  Logging.STATE_RESOLVING_LOGS_PATH = "resolving_logs_path";

  // ** The plugin internal state/variables.
  Logging.PluginState               = null;
  Logging.Paths                     = {};

  // ** Plugin variables/parameters.
  var parameters                    = PluginManager.parameters("Logging");
  var logging_enable_console_logger = Boolean(parameters["Enable Console Logger"] || "true");
  var logging_enable_file_logger    = Boolean(parameters["Enable File Logger"] || "true");
  var logging_directory             = String(parameters["Log Directory"] || "");
  var logging_filename              = String(parameters["Log Filename"] || "game.log");
  var logging_log_level             = String(parameters["Log Level"] || "INFO");
  var logging_log_format            = "%s [%s] - %s";

  //============================================================================
  // Logger
  //============================================================================

  /**
   *
   */
  function Logger() {
      this.initialize.apply(this, arguments);
  }

  Logger.prototype.initialize = function() {
    this._handlers = [];
    this.format = "";
    this.level = LogLevel.INFO;
  };

  Logger.prototype.addHandler = function(handler) {
    this._handlers.push(handler);
  };

  Logger.prototype.setLevel = function(level) {
    this.level = _checkLevel(level);
  };

  Logger.prototype.log = function(level, message) {
    var date = new Date(),
        formatted = "";
    if (this.level <= level) {
      formatted = util.format(Logging.Format, date.toISOString(), _levelToName(level), message);
      this._handlers.forEach(function (handler) {
        handler.write(formatted);
      });
    }
  };

  Logger.prototype.error = function(message) {
    this.log(LogLevel.ERROR, message);
  };

  Logger.prototype.debug = function(message) {
    this.log(LogLevel.DEBUG, message);
  };

  Logger.prototype.info = function(message) {
    this.log(LogLevel.INFO, message);
  };

  Logger.prototype.warn = function(message) {
    this.log(LogLevel.WARN, message);
  };

  //============================================================================
  // LogHandler
  //============================================================================

  function LogHandler() {
    this.initialize.apply(this, arguments);
  }

  LogHandler.prototype.__name__ = "LogHandler";
  LogHandler.prototype.initialize = function() {
  };

  LogHandler.prototype.write = function(message) {
    /* no-op */
  };

  //============================================================================
  // ConsoleHandler
  //============================================================================

  function ConsoleHandler() {
    this.initialize.apply(this, arguments);
  }

  ConsoleHandler.prototype = Object.create(LogHandler.prototype);
  ConsoleHandler.prototype.constructor = ConsoleHandler;

  ConsoleHandler.prototype.__name__ = "ConsoleHandler";
  ConsoleHandler.prototype.initialize = function() {
    this._ready = false;
    if (console) {
      this._ready = true;
    }
  };

  ConsoleHandler.prototype.write = function(message, level) {
    if (this._ready) {
      if (level === LogLevel.DEBUG) { console.debug(message); }
      else if (level === LogLevel.INFO) { console.info(message); }
      else if (level === LogLevel.WARN) { console.warn(message); }
      else if (level === LogLevel.ERROR) { console.error(message); }
      console.log(message);
    }
  };

  //============================================================================
  // FileStreamHandler
  //============================================================================

  /**
   *
   */
  function FileStreamHandler() {
    this.initialize.apply(this, arguments);
  }

  FileStreamHandler.prototype = Object.create(LogHandler.prototype);
  FileStreamHandler.prototype.constructor = FileStreamHandler;

  ConsoleHandler.prototype.__name__ = "FileStreamHandler";
  FileStreamHandler.prototype.initialize = function(fileName) {
    this._ready = false;
    this._logfile = path.resolve(Logging.Paths.logs_path, "./", fileName);

    // try {
    //   fs.openSync(this._logfile, "a+");
    // }
    // finally {
    //   fs.closeSync(this._logfile);
    // }

    var self = this;
    fs.open(this._logfile, "a+", function(err, fd) {
      if (err) {
        throw err;
      }
      self._ready = true;
      fs.closeSync(fd);
    });
  };

  FileStreamHandler.prototype.write = function(message, level) {
    var buffer;
    if (this._ready) {
      buffer = new Buffer(message + "\n");
      fs.open(this._logfile, "a+", function(err, fd) {
        if (err) {
          throw "An error was encountered when attemping to open the log file: " + err;
        }
        fs.write(fd, buffer, 0, buffer.length, null, function(err) {
          if (err) {
            throw "Error writing file: " + err;
          }
          fs.closeSync(fd);
        });
      });
    }
  };


  // **
  // If the logging subsystem hasn't initialized in 5 seconds, something has
  // gone horribly wrong and we want to abort all further setup operations.
  // This should prevent the logging plugin from blocking the normal game
  // behavior.
  // TODO: Create failsafe...

  function initialize() {
    // ** Begin initialization.
    Logging.PluginState = Logging.STATE_INITIALIZING;

    // **
    // Assign the log level to the Logging system.
    Logging.Level = _nameToLevel(logging_log_level);

    Logging.Format = logging_log_format;

    // **
    // The format of the file directory may be something like: /C:/Path/To/Project
    // if it is, the file system module will not be able to resolve the realpath,
    // so we need to slice the first character off.
    var pathname = fs.realpathSync(getGameDirectory());
    Logging.Paths.root_path = pathname;
    Logging.Paths.logs_path = pathname;

    //
    Logging.PluginState = Logging.STATE_RESOLVING_LOGS_PATH;
    if (logging_directory) {
      logging_directory = resolveToLocalPath(logging_directory);
      logging_directory = path.resolve(Logging.Paths.root_path, "./", logging_directory);
      Logging.Paths.logs_path = logging_directory;
    }

    fs.access(Logging.Paths.logs_path, fs.F_OK | fs.R_OK, function(err) {
      if (err) {
        fs.mkdir(Logging.Paths.logs_path);
      }

      Logging.logger = createLogger("Game", Logging.Level);
      Logging.PluginState = Logging.STATE_DONE;
    });
  }

  /**
   *
   */
  function createLogger(name, level) {
    var logger = new Logger();
    logger.setLevel(level);

    if (logging_enable_console_logger) {
      var consoleHandler = new ConsoleHandler();
      logger.addHandler(consoleHandler);
    }

    if (logging_enable_file_logger) {
      var fileStreamHandler = new FileStreamHandler(path.basename(logging_filename));
      logger.addHandler(fileStreamHandler);
    }
    return logger;
  }

  /**
   *
   */
  function getGameDirectory() {
    var dir = path.dirname(window.location.pathname);
    if (dir.match(/^\/([A-Z]\:)/)) {
        dir = dir.slice(1);
    }
    return dir;
  }

  /**
   * Resolve a file path to a local-only file path. This should prevent
   * specifying a path outside of the project directory.
   */
  function resolveToLocalPath(filePath) {
    var pattern = /[\/\\]?(?:.+[\/\\]+?)?(.+?)[\/\\]?/g;
    return filePath.replace(pattern, "$1");
  }

  initialize();
})();
