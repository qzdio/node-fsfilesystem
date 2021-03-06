import os from 'os';
import { expect } from 'chai';
import sinon from 'sinon';
import rewire from 'rewire';

const fsfilesystem = rewire('../../src/index.js');

describe('common core', function() {
  describe('validateDev', function() {
    const validateDev = fsfilesystem.__get__('validateDev');

    it('should return dev if dev is a function', function(done){
      const dev = sinon.spy();
      expect(validateDev(dev)).to.be.equal(dev);
      done();
    });

    it('should return a function matching against dev if dev is a string', function(done){
      const dev = 'disk0';
      const filter = validateDev(dev);
      expect(filter(0, 'disk0')).to.be.true;
      expect(filter(0, 'DISK0')).to.be.false;
      expect(filter(0, 'disk0s1')).to.be.true;
      expect(filter(0, 'random stuff')).to.be.false;
      done();
    });

    it('should return a function testing dev if dev is instanceof RegExp', function(done){
      const dev = /[a-z]{2}0/;
      const filter = validateDev(dev);
      expect(filter(0, 'az0')).to.be.equal(dev.test('az0'));
      expect(filter(0, 'b0')).to.be.equal(dev.test('b0'));
      expect(filter(0, 'aG0')).to.be.equal(dev.test('aG0'));
      expect(filter(0, 'az')).to.be.equal(dev.test('az'));
      expect(filter(0, 'yta0')).to.be.equal(dev.test('yta0'));
      done();
    });

    it('should return a tautological function given an undefined/null value', function(done){
      const tautology = fsfilesystem.__get__('tautology');
      expect(validateDev(undefined)).to.be.equal(tautology);
      expect(validateDev(null)).to.be.equal(tautology);
      done();
    });

    it('should throw if dev is not a function, string, regex or undefined/null', function(done){
      const throws = (value) => {
        expect(validateDev.bind(null, value)).to.throw(
          `fs.filesystem expected first argument 'dev' to be a function, string, regex or undefined/null. ` +
          `Found ${typeof value === 'object' ? value.constructor.name : typeof value} instead.`
        );
      };

      throws(true);
      throws(false);
      throws(0);
      throws(1);
      throws(Symbol('Cupcakes'));
      throws({});
      done();
    });
  });

  describe('validateCallback', function() {
    const validateCallback = fsfilesystem.__get__('validateCallback');

    it('should return the passed argument if it is a function', function(done){
      const callback = () => {};
      expect(validateCallback(callback)).to.be.equal(callback);
      done();
    });

    it('should throw if callback is not a function', function(done){
      const throws = (value) => {
        expect(validateCallback.bind(null, value)).to.throw(
          `fs.filesystem expected second argument 'callback' to be instanceof function. ` +
          `Found ${typeof value === 'object' ? value.constructor.name : typeof value} instead.`
        );
      };

      throws(true);
      throws(false);
      throws(0);
      throws(1);
      throws(Symbol('Cupcakes'));
      throws({});
      done();
    });
  });

  describe('validate', function() {
    const validate = fsfilesystem.__get__('validate');

    it('should return tautology as filter and first arg as callback if first arg is a function and second is undefined', function(done){
      const tautology = fsfilesystem.__get__('tautology');
      const first = () => {};
      const validated = validate(() => {}, () => {})(first);
      expect(validated[0]).to.be.equal(tautology);
      expect(validated[1]).to.be.equal(first);
      done();
    });

    it('should return an array with validated first and second arg if both are provided', function(done){
      const vdspy = sinon.spy();
      const validateDev = (f) => { vdspy(f); return f; };
      const vcspy = sinon.spy();
      const validateCallback = (f) => { vcspy(f); return f; };
      const first = () => {};
      const second = () => {};
      const validated = validate(validateDev, validateCallback)(first, second);
      expect(validated[0]).to.be.equal(first);
      expect(validated[1]).to.be.equal(second);
      expect(vdspy.calledOnce).to.be.true;
      expect(vdspy.calledWith(first)).to.be.true;
      expect(vcspy.calledOnce).to.be.true;
      expect(vcspy.calledWith(second)).to.be.true;
      done();
    });
  });

  describe('execute', function() {
    const execute = fsfilesystem.__get__('execute');

    it('should exec child process and feed the output in curried parser (sync = true)', function(done) {
      const cmd = `echo Hello World`;
      const parserSpy1 = sinon.spy();
      const parserSpy2 = sinon.spy();
      const filter = () => {};
      const parser = (f) => {
        parserSpy1(f);
        return (x) => { parserSpy2(x); return x; };
      };

      execute(cmd, parser)(filter, null, true);
      expect(parserSpy1.calledOnce).to.be.true;
      expect(parserSpy1.calledWith(filter)).to.be.true;
      expect(parserSpy2.calledOnce).to.be.true;
      expect(parserSpy2.args[0][0].toString()).to.be.equal(`Hello World${os.EOL}`);
      done();
    });

    it('should exec child process and throw an error (sync = true)', function(done) {
      const cmd = os.platform() === 'win32'
        ? `error`
        : `>&2 echo 'Echoed Error'; exit 1`;
      const error = os.platform() === 'win32'
        ? `Command failed: error\n'error' is not recognized as an internal or ` +
          `external command,\r\noperable program or batch file.\r\n`
        : `Command failed: >&2 echo 'Echoed Error'; exit 1${os.EOL}` +
          `Echoed Error${os.EOL}`;
      const parserSpy1 = sinon.spy();
      const parserSpy2 = sinon.spy();
      const filter = () => {};
      const parser = (f) => {
        parserSpy1(f);
        return (x) => { parserSpy2(x); return x; };
      };

      const exe = execute(cmd, parser);
      expect(exe.bind(null, filter, null, true)).to.throw(error);
      done();
    });

    it('should exec child process and feed the output in curried parser, then callback (sync = false)', function() {
      const cmd = `echo Hello World`;
      const parserSpy1 = sinon.spy();
      const parserSpy2 = sinon.spy();
      const filter = () => {};
      const callback = sinon.spy();
      const parser = (f) => {
        parserSpy1(f);
        return (x) => { parserSpy2(x); return x.toString(); };
      };

      return execute(cmd, parser)(filter, callback)
        .then(() => {
          expect(parserSpy1.calledOnce).to.be.true;
          expect(parserSpy1.calledWith(filter)).to.be.true;
          expect(parserSpy2.calledOnce).to.be.true;
          expect(parserSpy2.args[0][0].toString()).to.be.equal(`Hello World${os.EOL}`);
          expect(callback.calledOnce).to.be.true;
          expect(callback.args[0][0]).to.be.null;
          expect(callback.args[0][1]).to.be.a('string');
        });
    });

    it('should exec child process and catch an error (sync = false)', function() {
      const cmd = os.platform() === 'win32'
        ? `error`
        : `>&2 echo 'Echoed Error'; exit 1`;
      const error = os.platform() === 'win32'
        ? `Command failed: error\n'error' is not recognized as an internal or ` +
          `external command,\r\noperable program or batch file.\r\n`
        : `Command failed: >&2 echo 'Echoed Error'; exit 1${os.EOL}` +
          `Echoed Error${os.EOL}`;
      const parserSpy1 = sinon.spy();
      const parserSpy2 = sinon.spy();
      const filter = () => {};
      const callback = sinon.spy();
      const parser = (f) => {
        parserSpy1(f);
        return (x) => { parserSpy2(x); return x; };
      };

      return execute(cmd, parser)(filter, callback)
        .then(() => {
          expect(callback.calledOnce).to.be.true;
          expect(callback.args[0][0]).to.be.instanceof(Error);
          expect(callback.args[0][0].message).to.be.equal(error);
        });
    });
  });

  describe('filesystem', function() {
    const filesystem = fsfilesystem.__get__('filesystem');

    it('should call the appropriate os function (macOS)', function(done) {
      const macOSSpy = sinon.spy();
      const macOS = () => { macOSSpy(); return { devices: {} }; };
      const linuxSpy = sinon.spy();
      const linux = () => { linuxSpy(); return { devices: {} }; };
      const windowsSpy = sinon.spy();
      const windows = () => { windowsSpy(); return { devices: {} }; };
      const validate = () => [() => {}, () => {}];
      filesystem(macOS, linux, windows, validate, 'darwin')('dev', () => {});
      expect(macOSSpy.calledOnce).to.be.true;
      expect(linuxSpy.notCalled).to.be.true;
      expect(windowsSpy.notCalled).to.be.true;
      done();
    });

    it('should call the appropriate os function (linux)', function(done) {
      const macOSSpy = sinon.spy();
      const macOS = () => { macOSSpy(); return { devices: {} }; };
      const linuxSpy = sinon.spy();
      const linux = () => { linuxSpy(); return { devices: {} }; };
      const windowsSpy = sinon.spy();
      const windows = () => { windowsSpy(); return { devices: {} }; };
      const validate = () => [() => {}, () => {}];
      filesystem(macOS, linux, windows, validate, 'linux')('dev', () => {});
      expect(macOSSpy.notCalled).to.be.true;
      expect(linuxSpy.calledOnce).to.be.true;
      expect(windowsSpy.notCalled).to.be.true;
      done();
    });

    it('should call the appropriate os function (windows)', function(done) {
      const macOSSpy = sinon.spy();
      const macOS = () => { macOSSpy(); return { devices: {} }; };
      const linuxSpy = sinon.spy();
      const linux = () => { linuxSpy(); return { devices: {} }; };
      const windowsSpy = sinon.spy();
      const windows = () => { windowsSpy(); return { devices: {} }; };
      const validate = () => [() => {}, () => {}];
      filesystem(macOS, linux, windows, validate, 'win32')('dev', () => {});
      expect(macOSSpy.notCalled).to.be.true;
      expect(linuxSpy.notCalled).to.be.true;
      expect(windowsSpy.calledOnce).to.be.true;
      done();
    });

    it('should throw an error for unsupported OSes', function(done) {
      const macOSSpy = sinon.spy();
      const macOS = () => { macOSSpy(); return { devices: {} }; };
      const linuxSpy = sinon.spy();
      const linux = () => { linuxSpy(); return { devices: {} }; };
      const windowsSpy = sinon.spy();
      const windows = () => { windowsSpy(); return { devices: {} }; };
      const validate = () => [() => {}, () => {}];
      const aix = filesystem(macOS, linux, windows, validate, 'aix');
      const freebsd = filesystem(macOS, linux, windows, validate, 'freebsd');
      const openbsd = filesystem(macOS, linux, windows, validate, 'openbsd');
      const sunos = filesystem(macOS, linux, windows, validate, 'sunos');
      const any = filesystem(macOS, linux, windows, validate, '~mAgIcAL OpERaTing sYS~');
      expect(aix.bind(null, 'dev', () => {})).to.throw(
        'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
        'aix at the moment'
      );
      expect(freebsd.bind(null, 'dev', () => {})).to.throw(
        'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
        'freebsd at the moment'
      );
      expect(openbsd.bind(null, 'dev', () => {})).to.throw(
        'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
        'openbsd at the moment'
      );
      expect(sunos.bind(null, 'dev', () => {})).to.throw(
        'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
        'sunos at the moment'
      );
      expect(any.bind(null, 'dev', () => {})).to.throw(
        'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
        '~mAgIcAL OpERaTing sYS~ at the moment'
      );
      done();
    });
  });

  describe('filesystemSync', function() {
    const filesystemSync = fsfilesystem.__get__('filesystemSync');

    it('should call the appropriate os function with sync = true (macOS)', function(done) {
      const macOSSpy = sinon.spy();
      const macOS = (...args) => { macOSSpy(...args); return { devices: {} }; };
      const linuxSpy = sinon.spy();
      const linux = (...args) => { linuxSpy(...args); return { devices: {} }; };
      const windowsSpy = sinon.spy();
      const windows = (...args) => { windowsSpy(...args); return { devices: {} }; };
      const dev = () => {};
      const validate = () => dev;
      filesystemSync(macOS, linux, windows, validate, 'darwin')('dev', () => {});
      expect(macOSSpy.calledOnce).to.be.true;
      expect(linuxSpy.notCalled).to.be.true;
      expect(windowsSpy.notCalled).to.be.true;
      expect(macOSSpy.calledWith(validate(), null, true)).to.be.true;
      done();
    });

    it('should call the appropriate os function with sync = true (linux)', function(done) {
      const macOSSpy = sinon.spy();
      const macOS = (...args) => { macOSSpy(...args); return { devices: {} }; };
      const linuxSpy = sinon.spy();
      const linux = (...args) => { linuxSpy(...args); return { devices: {} }; };
      const windowsSpy = sinon.spy();
      const windows = (...args) => { windowsSpy(...args); return { devices: {} }; };
      const dev = () => {};
      const validate = () => dev;
      filesystemSync(macOS, linux, windows, validate, 'linux')('dev', () => {});
      expect(macOSSpy.notCalled).to.be.true;
      expect(linuxSpy.calledOnce).to.be.true;
      expect(windowsSpy.notCalled).to.be.true;
      expect(linuxSpy.calledWith(validate(), null, true)).to.be.true;
      done();
    });

    it('should call the appropriate os function with sync = true (windows)', function(done) {
      const macOSSpy = sinon.spy();
      const macOS = (...args) => { macOSSpy(...args); return { devices: {} }; };
      const linuxSpy = sinon.spy();
      const linux = (...args) => { linuxSpy(...args); return { devices: {} }; };
      const windowsSpy = sinon.spy();
      const windows = (...args) => { windowsSpy(...args); return { devices: {} }; };
      const dev = () => {};
      const validate = () => dev;
      filesystemSync(macOS, linux, windows, validate, 'win32')('dev', () => {});
      expect(macOSSpy.notCalled).to.be.true;
      expect(linuxSpy.notCalled).to.be.true;
      expect(windowsSpy.calledOnce).to.be.true;
      expect(windowsSpy.calledWith(validate(), null, true)).to.be.true;
      done();
    });

    it('should throw an error for unsupported OSes', function(done) {
      const macOSSpy = sinon.spy();
      const macOS = (...args) => { macOSSpy(...args); return { devices: {} }; };
      const linuxSpy = sinon.spy();
      const linux = (...args) => { linuxSpy(...args); return { devices: {} }; };
      const windowsSpy = sinon.spy();
      const windows = (...args) => { windowsSpy(...args); return { devices: {} }; };
      const dev = () => {};
      const validate = () => dev;
      const aix = filesystemSync(macOS, linux, windows, validate, 'aix');
      const freebsd = filesystemSync(macOS, linux, windows, validate, 'freebsd');
      const openbsd = filesystemSync(macOS, linux, windows, validate, 'openbsd');
      const sunos = filesystemSync(macOS, linux, windows, validate, 'sunos');
      const any = filesystemSync(macOS, linux, windows, validate, '~mAgIcAL OpERaTing sYS~');
      expect(aix.bind(null, 'dev', () => {})).to.throw(
        'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
        'aix at the moment'
      );
      expect(freebsd.bind(null, 'dev', () => {})).to.throw(
        'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
        'freebsd at the moment'
      );
      expect(openbsd.bind(null, 'dev', () => {})).to.throw(
        'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
        'openbsd at the moment'
      );
      expect(sunos.bind(null, 'dev', () => {})).to.throw(
        'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
        'sunos at the moment'
      );
      expect(any.bind(null, 'dev', () => {})).to.throw(
        'fs.filesystem : Unsupported OS. fs.filesystem does not support ' +
        '~mAgIcAL OpERaTing sYS~ at the moment'
      );
      done();
    });
  });
});
