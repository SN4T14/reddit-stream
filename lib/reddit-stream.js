// Generated by CoffeeScript 1.7.1
var BACKTRACK_POLL_INTERVAL, LIMIT, MAX_ATTEMPTS, POLL_INTERVAL, RedditStream, events, q, reddit,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

q = require('q');

events = require('events');

reddit = require('rereddit');

LIMIT = 100;

MAX_ATTEMPTS = 5;

POLL_INTERVAL = 5000;

BACKTRACK_POLL_INTERVAL = 2000;

module.exports = RedditStream = (function(_super) {
  var _user;

  __extends(RedditStream, _super);

  _user = null;

  function RedditStream(type, subreddit, user_agent) {
    this.type = type;
    this.subreddit = subreddit != null ? subreddit : 'all';
    if (user_agent == null) {
      user_agent = 'reddit-stream bot';
    }
    this.getItems = __bind(this.getItems, this);
    reddit.user_agent = user_agent;
    if (!(this.type === 'posts' || this.type === 'comments')) {
      throw new Error('type must be "posts" or "comments"');
    }
  }

  RedditStream.prototype.login = function(username, password) {
    var deferred, request;
    deferred = q.defer();
    request = reddit.login(username, password);
    request.end(function(error, response) {
      if (error != null) {
        return deferred.reject(error);
      } else {
        deferred.resolve(response);
        return _user = response;
      }
    });
    return deferred.promise;
  };

  RedditStream.prototype.start = function() {
    return this.getItems();
  };

  RedditStream.prototype.getItems = function(newest, last_newest, after, attempt, is_backtracking) {
    var request;
    if (newest == null) {
      newest = '';
    }
    if (last_newest == null) {
      last_newest = '';
    }
    if (after == null) {
      after = '';
    }
    if (attempt == null) {
      attempt = 1;
    }
    if (is_backtracking == null) {
      is_backtracking = false;
    }
    if (this.type === 'posts') {
      request = reddit.read("" + this.subreddit + "/new");
    } else if (this.type === 'comments') {
      request = reddit.read("" + this.subreddit + "/comments");
    }
    request.limit(LIMIT);
    if (_user != null) {
      request.as(_user);
    }
    if (after !== '') {
      request.after(after);
    }
    return request.end((function(_this) {
      return function(error, response, user, res) {
        var item, items, new_items, should_backtrack, _i, _len, _ref, _ref1;
        items = response != null ? (_ref = response.data) != null ? _ref.children : void 0 : void 0;
        if ((error != null) || (items == null)) {
          if (error != null) {
            console.error(error, response);
          }
          if (++attempt <= MAX_ATTEMPTS) {
            return setTimeout((function() {
              return _this.getItems(newest, last_newest, after, attempt, is_backtracking);
            }), POLL_INTERVAL);
          } else if (!is_backtracking) {
            return setTimeout(_this.getItems, POLL_INTERVAL);
          }
        } else {
          new_items = [];
          if (items.length > 0) {
            for (_i = 0, _len = items.length; _i < _len; _i++) {
              item = items[_i];
              if (is_backtracking) {
                if (item.data.name <= last_newest) {
                  break;
                }
              } else {
                if (item.data.name <= newest) {
                  break;
                }
              }
              new_items.push(item);
            }
            if (items[0].data.name > newest && !is_backtracking) {
              last_newest = newest;
              newest = items[0].data.name;
            }
            after = items[items.length - 1].data.name;
          }
          if (new_items.length > 0) {
            _this.emit('new', new_items);
          }
          should_backtrack = new_items.length === items.length;
          if (last_newest === '' || ((0 <= (_ref1 = items.length) && _ref1 < LIMIT))) {
            should_backtrack = false;
          }
          if (is_backtracking) {
            if (should_backtrack) {
              return setTimeout((function() {
                return _this.getItems(newest, last_newest, after, 1, true);
              }), BACKTRACK_POLL_INTERVAL);
            }
          } else {
            if (should_backtrack) {
              setTimeout((function() {
                return _this.getItems(newest, last_newest, after, 1, true);
              }), 0);
            }
            return setTimeout((function() {
              return _this.getItems(newest, last_newest);
            }), POLL_INTERVAL);
          }
        }
      };
    })(this));
  };

  return RedditStream;

})(events.EventEmitter);