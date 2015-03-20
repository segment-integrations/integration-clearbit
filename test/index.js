'use strict';

var Direct = require('..');
var Test = require('segmentio-integration-tester');
var assert = require('assert');
var express = require('express');
var snakeize = require('snakeize');

describe('Direct', function(){
  var app;
  var server;
  var settings;
  var test;
  var direct;
  var types = ['track', 'identify', 'alias', 'group', 'page', 'screen'];

  before(function(done){
    app = express();
    app.use(express.bodyParser());
    server = app.listen(4000, done);
  });

  after(function(done){
    server.close(done);
  });

  beforeEach(function(){
    settings = {
      endpoint: 'http://localhost:4000'
    };
    direct = new Direct(settings);
    test = Test(direct, __dirname);
  });

  it('should have the correct settings', function(){
    test
    .name('Direct')
    .channels(['server', 'mobile', 'client'])
    .timeout('3s')
    .retries(1);
  });

  describe('.validate()', function(){
    it('should be invalid if .endpoint isn\'t a url', function(){
      test.invalid({}, { endpoint: true });
      test.invalid({}, { endpoint: '' });
      test.invalid({}, { endpoint: 'aaa' });
    });

    it('should be valid if .endpoint is a url', function(){
      test.valid({}, settings);
    });
  });

  types.forEach(function(type){
    describe('#' + type, function(){
      var json;

      beforeEach(function(){
        json = test.fixture(type + '-basic');
      });

      it('should succeed on valid call', function(done){
        var route = '/' + type + '/success';
        settings.endpoint += route;

        app.post(route, function(req, res){
          assert.deepEqual(req.body, snakeize(json.output));
          res.send(200);
        });

        test
        .set(settings)
        [type](json.input)
        .expects(200)
        .end(done);
      });

      it('should error on invalid calls', function(done){
        var route = '/' + type + '/error';
        settings.endpoint += route;

        app.post(route, function(req, res){
          assert.deepEqual(req.body, snakeize(json.output));
          res.send(503);
        });

        test
        .set(settings)
        [type](json.input)
        .expects(503)
        .error(done);
      });

      it('should ignore bad reply', function(done){
        var route = '/bad';
        settings.endpoint += route;

        app.post(route, function(req, res){
          res.set('Content-Type', 'application/json');
          res.send(200, 'I lied, this is not JSON');
        });

        test
          .set(settings)
          [type](json.input)
          .expects(200)
          .end(done);
      });
    });
  });
});