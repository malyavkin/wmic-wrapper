"use strict";
let exec = require('child_process').exec;
let iconv = require('iconv-lite');
let co = require('co');
let _ = require('underscore');
function parseResults(raw){
    let lines = raw.split(/[\r\n]+/g);
    lines = lines.filter(line => line.length);
    let header = lines.shift();
    let regex = /\w+\s+/g;
    let columns = [];
    let match = regex.exec(header);
    while (match != null) {
        columns.push(match[0]);
        match = regex.exec(header);
    }
    let cols = _.zip(
        columns.map(x => x.trim()),
        columns.map(x => x.length));
    let processes = [];
    lines.forEach(line => {
        let processInfo ={};
        cols.forEach(column => {
            processInfo[column[0]] = line
                .slice(0,column[1])
                .trim();
            line = line.substr(column[1]);
        });
        processes.push(processInfo);
    });
    return processes;
}
function payload(){
    return new Promise(function(resolve,reject){
        exec('wmic process', {maxBuffer :1000*1024,encoding:null}, function (err, stdout, stderr){
            stdout = iconv.decode(stdout, "437");
            resolve(parseResults(stdout));
        });
    })
}
let WMIC = function(){
    this.query = [];
    return this;
};
WMIC.prototype.if = function(property, value){
    this.query.push([property,value]);
    return this;
};
WMIC.prototype.get = function(columns){
    this.columns = columns;
    return this;
};
WMIC.prototype.run = function(columns){
    let wmic = this;
    return new Promise(function(resolve,reject){
        let result = [];
        co(function*(){
            let processes = yield payload();
            result = processes.filter(proc => {
                let ok = true;
                wmic.query.forEach(condition => {
                    if(proc[condition[0]] !== condition[1])
                        ok=false;
                });
                return ok;
            });
            if(wmic.columns.length){
                result = result.map(proc=>{
                    return _.pick(proc,wmic.columns)
                });
            }
            resolve(result);
        }).catch(x=>console.log(x.stack));

    });
};


module.exports = WMIC;