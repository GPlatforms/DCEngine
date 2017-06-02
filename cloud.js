var AV = require('leanengine');
var req = require('sync-request');

AV.init({
    appId: process.env.LEANCLOUD_APP_ID || 'fydspRV31MNJIz3WCETBtB9G-gzGzoHsz',
    appKey: process.env.LEANCLOUD_APP_KEY || 'xLGbGl6XnCAPpzxxYi1SWhop',
    masterKey: process.env.LEANCLOUD_APP_MASTER_KEY || 'as3uMkrs6GHaIkJTkn1bgMrk'
})

AV.Cloud.useMasterKey()

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

AV.Cloud.define('getPlayUrl', function(request) {
    let url = request.params.url
    let res = req('GET', 'http://jxs.s.yunfan.com/remote/parse_kuaibo_new.php?format=high&ext=mp4&url=' + url)
    return JSON.parse(res.getBody('utf8'))
})

AV.Cloud.define('getWatchHistory', function(request) {
    let id = request.params.id
    let query = new AV.Query('record').equalTo('user_id', AV.Object.createWithoutData('_User', id))
    return query.first().then(function(results) {
        return Promise.all(results.get('list').map(n => fillSeriesItem(n)))
    }).catch(function(error) {
        throw error
    })
})

function fillSeriesItem(content) {
    return new Promise(function(res) {
        let query = new AV.Query('series').equalTo('objectId', content.series.id)
        query.first().then(function(item) {
            content.series = item;
            res(content)
        })
    })
}

function toObject(arr) {
    var rv = {};
    for (var i = 0; i < arr.length; ++i)
        rv[i] = arr[i];
    return rv;
}

function fetchTopic(content, limit) {
    return new Promise(function(res) {
        let query = new AV.Query('topic')
        query.equalTo('objectId', content)
        query.first().then(function(item) {
            let sList = item.get('list').slice(0, limit).map(n => fetchSeriesItem(n.id))
            Promise.all(sList).then(function(result) {
                res(result)
            })
        })
    })
}

function fetchSeriesItem(content) {
    return new Promise(function(res) {
        let query = new AV.Query('series')
        query.equalTo('objectId', content)
        query.first().then(function(item) {
            res(item)
        })
    })
}

function fetchSeriesList(content, limit) {
    return new Promise(function(res) {
        let query = new AV.Query('series')
        query.equalTo('tags.text', content)
        query.limit(limit).find().then(function(results) {
            res(results)
        })
    })
}

function fetchContent(dt) {
    if (dt.type == 4) {
        return fetchTopic(dt.content, dt.num)
    } else if (dt.type == 3) {
        return fetchSeriesItem(dt.content)
    } else {
        return fetchSeriesList(dt.content, dt.num)
    }
}

function fetchItem(item) {
    return new Promise(function(res) {
        let dt = item.get('detail')
        fetchContent(dt).then(function(list) {
            dt.list = list
            item.set('detail', dt)
            res(item)
        })
    })
}


function fetchList(results) {
    let resList = results.map(item => fetchItem(item))
    return Promise.all(resList)
}

AV.Cloud.define('choice', function(request) {
    let query = new AV.Query('choice')
    return query.find().then(function(results) {
        return fetchList(results)
    }).catch(function(error) {
        throw error
    })
})

AV.Cloud.define('last', function(request) {
    let query = new AV.Query('last')
    return query.find().then(function(results) {
        return fetchList(results)
    }).catch(function(error) {
        throw error
    })
})

function releationSeries(item) {
    return new Promise(function(res) {
        let tags = item.get('tags')
        let tagCount = tags.length
        let rTag = Math.floor(Math.random() * (tagCount - 1))
        let tag = tags[rTag].text

        fetchSeriesList(tag, 2).then(function(results) {
            item.set('relate', results)
            res(item)
        })
    })
}


function hotDiscuss(item) {
    return new Promise(function(res, rej) {
        let query = new AV.Query('discuss')
        query.equalTo('series_id', item)
        query.limit(10).find().then(function(results) {
            item.set('discuss', results)
            res(item)
        }, function(error) {
            rej(error)
        })
    })
}

AV.Cloud.define('series', function(request) {
    let query = new AV.Query('series')
    query.equalTo('objectId', request.params.id)
    return query.first().then(function(item) {
        return releationSeries(item)
    }).then(function(item) {
        return hotDiscuss(item)
    }).catch(function(error) {
        throw error
    })
})
