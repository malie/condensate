"use strict";
var assert = require('assert')
var util = require('util')

const AND  = 'and';
const OR   = 'or';
const XOR  = 'xor';
const EQ   = 'eq';
const NAND = 'nand';
const NOR  = 'nor';
const NOT  = 'not';

function isOp(x) {
  return (typeof x) == 'object' && !!x.op}

function varOrNegVar(x) {
  return (!isOp(x)
	  || (isOp(x) && x.op === NOT))}

function and() {
  return {op:AND, args: Array.prototype.slice.call(arguments)}}

function or() {
  return {op:OR, args: Array.prototype.slice.call(arguments)}}

function xor() {
  return {op:XOR, args: Array.prototype.slice.call(arguments)}}

function eq() {
  return {op:EQ, args: Array.prototype.slice.call(arguments)}}

function nand() {
  return {op:NAND, args: Array.prototype.slice.call(arguments)}}

function nor() {
  return {op:NOR, args: Array.prototype.slice.call(arguments)}}

function not(x) {
  if (isOp(x)) {
    if (x.op === NOT) {
      return x.args[0]}
    else if (x.op === AND) {
      return nand.apply(null, x.args)}
    else if (x.op === OR) {
      return nor.apply(null, x.args)}
    else if (x.op === NAND) {
      return and.apply(null, x.args)}
    else if (x.op === NOR) {
      return or.apply(null, x.args)}
    else if (x.op === XOR) {
      return eq.apply(null, x.args)}
    else if (x.op === EQ) {
      return xor.apply(null, x.args)}}
  return {op:NOT, args: [x]}}

function tseitin(x) {
  return new tseitinEncoder().encode(x).clauses}

class tseitinEncoder {
  constructor() {
    this.clauses = []}
  encode(x) {
    this.tseitin_outer(x)
    return this}

  // enter AND nodes
  tseitin_outer(x) {
    if (isOp(x) && x.op === AND) {
      for (var c of x.args)
	this.tseitin_outer(c)}
    else {
      let v = this.tseitin_inner(x);
      if (v)
	this.clauses.push([v])}}

  // see if a AND child consists only of OR's else encode it
  tseitin_inner(x) {
    let parts = this.deep_or(x);
    if (parts !== null) {
      this.clauses.push(parts)
      return null}
    else {
      return this.connective(x)}}

  // OR of optionally negated vars
  deep_or(x0) {
    var res = []
    var stack = [x0];
    while (stack.length > 0) {
      var x = stack.pop();
      if (varOrNegVar(x))
	res.push(x)
      else if (isOp(x) && x.op === OR) {
	for (var t of x.args) {
	  stack.push(t)}}
      else {
	return null}}
    res.reverse()
    return res}

}



function tseitin_tests() {
  assert.deepEqual(
    tseitin(and(or('a','b'), or('b','c', or('d', 'e')))),
    [['a', 'b' ],
     ['b', 'c', 'd', 'e']])

  assert.deepEqual(
    tseitin(and(or(not('a'),'b'), or('b',not('c'),
				     or('d', not('e'))))),
    [[not('a'), 'b' ],
     ['b', not('c'), 'd', not('e')]])
  
  assert.deepEqual(
    tseitin(and(not('a'),'b')),
    [[not('a')],
     ['b' ]])


  console.log('ok')
}


//   console.log(util.inspect(input, null, 5))
// let ts = tseitin(input)
// console.log(util.inspect(ts, null, 5))
tseitin_tests()
