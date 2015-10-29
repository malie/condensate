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

function isVar(x) {
  return !isOp(x)}

function isNotVar(x) {
  return (isOp(x)
	  && x.op === NOT
	  && isVar(x.args[0]))}

function varOrNegVar(x) {
  return (isVar(x)
	  || isNotVar(x))}

function isOr(x) {
  return isOp(x) && x.op === OR}

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
    this.clauses = []
    this.gensymId = 0}
  
  encode(x) {
    this.tseitin_ands(x)
    return this}

  // enter AND nodes
  tseitin_ands(x) {
    if (isOp(x) && x.op === AND) {
      for (var c of x.args)
	this.tseitin_ands(c)}
    else {
      let clause = this.tseitin_ors(x);
      if (clause)
	this.addClause(clause)}}

  addClause(clause) {
    this.clauses.push(clause)}

  tseitin_ors(x) {
    if (varOrNegVar(x))
      return [x]
    var vs = this.deep_or(x);
    return this.tseitin_args(vs)}

  tseitin_args(args) {
    return args.map(arg => this.tseitin_arg(arg))}

  tseitin_arg(x) {
    if (varOrNegVar(x))
      return x;
    else {
      assert(isOp(x))
      if (x.op === OR)
	return this.tseitin_or(this.tseitin_args(x.args))
      else if (x.op === AND)
	return this.tseitin_and(this.tseitin_args(x.args))
      else if (x.op === XOR)
	return this.tseitin_xor(this.tseitin_args(x.args))
      else if (x.op === EQ)
	return this.tseitin_eq(this.tseitin_args(x.args))
      else if (x.op === NOR)
	return this.tseitin_nor(this.tseitin_args(x.args))
      else if (x.op === NAND)
	return this.tseitin_nand(this.tseitin_args(x.args))}}

  gensym(prefix) {
    return '' + (prefix||'') + '*' + (this.gensymId+=1)}

  
  // x => (a|b|c), -x => -a&-b&-c
  // -x|a|b|c, x|-a, x|-b, x|-c
  // ("," is a low prio AND)
  tseitin_or(bs) {
    var x = this.gensym('or');
    this.addClause([not(x)].concat(bs))
    for (var b of bs)
      this.addClause([x, not(b)])
    return x}

  // x => (a&b&c), -x => -a|-b|-c
  // -x|(a&b&c), x|-a|-b|-c
  // -x|a, -x|b, -x|c, x|-a|-b|-c
  tseitin_and(bs) {
    var x = this.gensym('and');
    this.addClause([x].concat(bs.map(not)))
    for (var b of bs)
      this.addClause([not(x), b])
    return x}

  
  // OR of OR's
  deep_or(x0) {
    var res = []
    var stack = [x0];
    while (stack.length > 0) {
      var x = stack.pop();
      if (!isOr(x))
	res.push(x)
      else
	for (var t of x.args)
	  stack.push(t)}
    res.reverse()
    return res}

}

function printClauses(clauses) {
  for (var clause of clauses) {
    printClause(clause)}}

function printClause(clause) {
  var text = []
  for (var lit of clause) {
    if (isNotVar(lit)) {
      text.push('-' + lit.args[0])}
    else if (isVar(lit)) {
      text.push(lit)}
    else {
      assert(false, util.inspect(lit, null, 4))}}
  console.log(text.join(' '))}

function tseitin_test(x, expected) {
  let res = tseitin(x);
  try {
    assert.deepEqual(res, expected)
  } catch (e) {
    console.log('\nresult is')
    console.log(util.inspect(res, null, 4))
    console.log('\nresult is')
    printClauses(res)
    throw e;
  }}

function tseitin_tests() {
  tseitin_test(
    and(or('a','b'), or('b','c', or('d', 'e'))),
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
     ['b']])

  printClauses(
    tseitin(and(or(and('a','b'), and('c', 'd')), 'e')))

  printClauses(
    tseitin(or(and('a','b'), and('c', 'd'))))

  console.log('ok')
}


//   console.log(util.inspect(input, null, 5))
// let ts = tseitin(input)
// console.log(util.inspect(ts, null, 5))
tseitin_tests()
