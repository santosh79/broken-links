var _ = require('underscore');

function addToSet(set, element) {
  return _.chain(set).reject(function(el) {
    return el === element;
  }).concat([element]).value();
}
exports.addToSet = addToSet;

function isInSet(set, element) {
  return !!(_.find(set, function(el) {
    return el === element;
  }));
}
exports.isInSet = isInSet;

exports.create = function() {
  return [];
}

function isNotInSet(set, element) {
  return !isInSet(set, element);
}
exports.isNotInSet = isNotInSet;

function difference(set, otherSet) {
  return _.difference(set, otherSet);
}
exports.difference = difference;

function union(set, otherSet) {
  return _.union(set, otherSet);
}
exports.union = union;
