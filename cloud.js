var AV = require('leanengine');
var req = require('sync-request');

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request) {
    return 'Hello world!'
});

AV.Cloud.define('baidu', function(request) {
    let res = req('GET', 'http://www.baidu.com')
    return res.getBody('utf8')
})