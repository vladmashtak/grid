import { Injectable} from '@angular/core';

@Injectable()
export class GridUtilesService {
  isFunction(func) {
    return typeof func === 'function' || Object.prototype.toString.call(func) === '[object Function]';
  }

  findInArray(array, callback) {
    for (var i = 0, length = array.length, element = null; i < length, element = array[i]; i++) {
      if (callback.apply(callback, [element, i, array])) return element;
    }
  }

  matchesSelector(el, selector) {
    let isFunc:Function = this.isFunction;
    var method = this.findInArray([
      'matches',
      'webkitMatchesSelector',
      'mozMatchesSelector',
      'msMatchesSelector',
      'oMatchesSelector'
    ], function (method) {
      return isFunc(el[method]);
    });

    return el[method].call(el, selector);
  }

  positionToCSSTransform(style) {
    let template:string = 'translate(' + style.left + 'px,' + style.top + 'px)';
    style.transform = template;
    style.WebkitTransform = template;
    style.OTransform = template;
    style.msTransform = template;
    style.MozTransform = template;
    delete style.left;
    delete style.top;
    return style;
  }
}
