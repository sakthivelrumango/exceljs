"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var BaseXform = require('../base-xform');

var ColorXform = require('./color-xform');

var EdgeXform =
/*#__PURE__*/
function (_BaseXform) {
  _inherits(EdgeXform, _BaseXform);

  function EdgeXform(name) {
    var _this;

    _classCallCheck(this, EdgeXform);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(EdgeXform).call(this));
    _this.name = name;
    _this.map = {
      color: new ColorXform()
    };
    return _this;
  }

  _createClass(EdgeXform, [{
    key: "render",
    value: function render(xmlStream, model, defaultColor) {
      var color = model && model.color || defaultColor || this.defaultColor;
      xmlStream.openNode(this.name);

      if (model && model.style) {
        xmlStream.addAttribute('style', model.style);

        if (color) {
          this.map.color.render(xmlStream, color);
        }
      }

      xmlStream.closeNode();
    }
  }, {
    key: "parseOpen",
    value: function parseOpen(node) {
      if (this.parser) {
        this.parser.parseOpen(node);
        return true;
      }

      switch (node.name) {
        case this.name:
          {
            var style = node.attributes.style;

            if (style) {
              this.model = {
                style: style
              };
            } else {
              this.model = undefined;
            }

            return true;
          }

        case 'color':
          this.parser = this.map.color;
          this.parser.parseOpen(node);
          return true;

        default:
          return false;
      }
    }
  }, {
    key: "parseText",
    value: function parseText(text) {
      if (this.parser) {
        this.parser.parseText(text);
      }
    }
  }, {
    key: "parseClose",
    value: function parseClose(name) {
      if (this.parser) {
        if (!this.parser.parseClose(name)) {
          this.parser = undefined;
        }

        return true;
      }

      if (name === this.name) {
        if (this.map.color.model) {
          if (!this.model) {
            this.model = {};
          }

          this.model.color = this.map.color.model;
        }
      }

      return false;
    }
  }, {
    key: "validStyle",
    value: function validStyle(value) {
      return EdgeXform.validStyleValues[value];
    }
  }, {
    key: "tag",
    get: function get() {
      return this.name;
    }
  }]);

  return EdgeXform;
}(BaseXform);

EdgeXform.validStyleValues = ['thin', 'dotted', 'dashDot', 'hair', 'dashDotDot', 'slantDashDot', 'mediumDashed', 'mediumDashDotDot', 'mediumDashDot', 'medium', 'double', 'thick'].reduce(function (p, v) {
  p[v] = true;
  return p;
}, {}); // Border encapsulates translation from border model to/from xlsx

var BorderXform =
/*#__PURE__*/
function (_BaseXform2) {
  _inherits(BorderXform, _BaseXform2);

  function BorderXform() {
    var _this2;

    _classCallCheck(this, BorderXform);

    _this2 = _possibleConstructorReturn(this, _getPrototypeOf(BorderXform).call(this));
    _this2.map = {
      top: new EdgeXform('top'),
      left: new EdgeXform('left'),
      bottom: new EdgeXform('bottom'),
      right: new EdgeXform('right'),
      diagonal: new EdgeXform('diagonal')
    };
    return _this2;
  }

  _createClass(BorderXform, [{
    key: "render",
    value: function render(xmlStream, model) {
      var color = model.color;
      xmlStream.openNode('border');

      if (model.diagonal && model.diagonal.style) {
        if (model.diagonal.up) {
          xmlStream.addAttribute('diagonalUp', '1');
        }

        if (model.diagonal.down) {
          xmlStream.addAttribute('diagonalDown', '1');
        }
      }

      function add(edgeModel, edgeXform) {
        if (edgeModel && !edgeModel.color && model.color) {
          // don't mess with incoming models
          edgeModel = Object.assign({}, edgeModel, {
            color: model.color
          });
        }

        edgeXform.render(xmlStream, edgeModel, color);
      }

      add(model.left, this.map.left);
      add(model.right, this.map.right);
      add(model.top, this.map.top);
      add(model.bottom, this.map.bottom);
      add(model.diagonal, this.map.diagonal);
      xmlStream.closeNode();
    }
  }, {
    key: "parseOpen",
    value: function parseOpen(node) {
      if (this.parser) {
        this.parser.parseOpen(node);
        return true;
      }

      switch (node.name) {
        case 'border':
          this.reset();
          this.diagonalUp = !!node.attributes.diagonalUp;
          this.diagonalDown = !!node.attributes.diagonalDown;
          return true;

        default:
          this.parser = this.map[node.name];

          if (this.parser) {
            this.parser.parseOpen(node);
            return true;
          }

          return false;
      }
    }
  }, {
    key: "parseText",
    value: function parseText(text) {
      if (this.parser) {
        this.parser.parseText(text);
      }
    }
  }, {
    key: "parseClose",
    value: function parseClose(name) {
      if (this.parser) {
        if (!this.parser.parseClose(name)) {
          this.parser = undefined;
        }

        return true;
      }

      if (name === 'border') {
        var model = this.model = {};

        var add = function add(key, edgeModel, extensions) {
          if (edgeModel) {
            if (extensions) {
              Object.assign(edgeModel, extensions);
            }

            model[key] = edgeModel;
          }
        };

        add('left', this.map.left.model);
        add('right', this.map.right.model);
        add('top', this.map.top.model);
        add('bottom', this.map.bottom.model);
        add('diagonal', this.map.diagonal.model, {
          up: this.diagonalUp,
          down: this.diagonalDown
        });
      }

      return false;
    }
  }]);

  return BorderXform;
}(BaseXform);

module.exports = BorderXform;
//# sourceMappingURL=border-xform.js.map
