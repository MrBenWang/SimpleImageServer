var fs = require('fs');
var path = require('path');
var formidable = require('formidable');
var gmglobe = require('gm').subClass({ imageMagick: true });
var setting = require('../config/setting.json');
var nodemailer = require('nodemailer');

// 生成随即字符串
function  randomChar(len)  {
    var x="0123456789"; // 去掉x
    var tmp="";
    //var timenow = Date.now();
    for(var i = 0;i < len; i++)  {
        tmp  +=  x.charAt(Math.ceil(Math.random()*100000) % x.length);
    }

    return tmp;
}


// 发送邮件
function sendMail(err,req,res){
    var errorMsg = ' Error ' + new Date().toISOString() + ' ' + req.url + 
            ' ' + err.stack || err.message || 'unknow error';

    var mailOptions = {
        from: setting.mail.from, // sender address
        to: setting.mail.to, // list of receivers
        subject: 'Picture Server Error', // Subject line
        text: errorMsg // plaintext body
    };

    var transporter = nodemailer.createTransport("SMTP",{
        host: setting.mail.host,
        port: setting.mail.port,
        auth: {
            user: setting.mail.auth.user,
            pass: setting.mail.auth.pass
        }
    });

    transporter.sendMail(mailOptions, function(error, response){
        if (error) {
            console.log(error.stack);
        } else {
            console.log('Message sent: ' + response.message);
        }
        response.sendStatus(500); // 如果没有返回的话,浏览器一直会在转圈
        transporter.close();
    });

}

// 创建目录
function createDir(dirPath){
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }
}

// 从文件名中获取路径  10_5_20_item23123.jpg
function splitFileName (fileName) {
    var strNames = fileName.split("_");
    var retPath = setting.image_dir; // 图片存放目录  
    for (var i = 0 ; i < strNames.length; i++) {
        retPath = retPath + "/" + strNames[i];
        createDir(retPath);
    }

    return retPath.replace("//","/");
}

// 跨域验证
exports.Verification = function (req,res){
    addheader(res,"OPTIONS,POST,GET,DELETE");
    return res.sendStatus(200); // 让options请求快速返回
}

function addheader(res,mymethods){
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length,uthorization,Accept,X-Requested-With");
    res.header("Access-Control-Allow-Methods", mymethods);
    res.header("X-Powered-By"," 1.0.0");
}
function generatefileName(filePath,extName)
{
    var fileNameLen = 5;
    var newImgName = randomChar(fileNameLen);//Date.now();
    if (extName ) {
        newImgName = newImgName + extName;
    }
    var fileName = path.join(filePath , newImgName);
    while(fs.existsSync(fileName))
    {
        fileNameLen++;
        newImgName =  extName ? randomChar(fileNameLen) + extName : randomChar(fileNameLen);
        fileName = path.join(filePath , newImgName);
    }
    return fileName;
}
function mkfulldir (dirnames) {
    if (!fs.existsSync(dirnames ))
    {
        var parentdir = path.dirname(dirnames);
        if (!fs.existsSync(parentdir))
        {
            mkfulldir(parentdir);
        }
        fs.mkdirSync(dirnames);
    }
}
// 上传
exports.upload = function (req, res) {

    addheader(res,"POST");

    var form = new formidable.IncomingForm();
    form.encoding = 'utf-8';
    form.keepExtensions = true;  //如果需要临时文件保持原始文件扩展名，设置为true    
    form.maxFieldsSize = 10 * 1024 * 1024; //文件大小限制，默认2MB     
    var tmpDir = setting.tmp_dir; //上传临时目录
    form.uploadDir = tmpDir;//目录需要已存在

    form.parse(req, function(err1, fields, files) {
        if(err1){
            sendMail(err1,req,res);
            return res.json({ 'success': false, 'Message': err });
        }
        if (! files) {
            return res.json({ 'success': false, 'Message': 'Not find the upload file' });
        }
        var filePath = "";
        if (fields && fields.path ) {
            filePath = path.join(setting.image_dir ,fields.path);

            mkfulldir(filePath);
        }
        else
        {
            filePath = splitFileName(files[item].name);
        }

        for (item in files) {
            var ext = path.extname(files[item].name);
            
            try {
                var imagePath = generatefileName(filePath , ext); // 图片完整路径

                // 将临时目录中的图片移动到图片存放目录下
                fs.rename(files[item].path, imagePath, function (err2) {
                    if (err2) {
                        sendMail(err2, req, res);
                        return res.json({ 'success': false, 'Message': err });
                    } else {
                        var localUrl = imagePath.replace(/\\/g,"/").replace(setting.image_dir, "/");
                        var fullUrl = setting.image_url + localUrl;
                        res.json({ 'success': true, 'message': 'Upload Image successfully!', 'fullUrl': fullUrl,'localUrl':localUrl });
                    }
                });
            }
            catch (err3) {
                sendMail(err3, req, res);
                return res.json({ 'success': false, 'Message': err3 });
            };
        }
    });
}

// 发送图片
function mySendreq(myres,mypath){
    myres.sendFile(mypath,function(err){
        if(err) {
            sendMail(err,myres);
            return myres.json({'success':false,'message':err});
        }
    });
}

/**
 * 下载
 */
exports.download = function(req,res){
    var url=req.url.toLowerCase().replace("/products/","");
    var strUrl = url.split("/");
    if (strUrl[0] == "") {
        strUrl.shift();
    }
    var size = strUrl[0].split("x");  // 小于2 表示 不需要缩放
    var fileName = strUrl[strUrl.length - 1];
    var fileDir = size.length < 2 ? url :url.replace(strUrl[0],"");
    var dir = setting.image_dir + fileDir.replace(fileName,"");
    var file_path = path.resolve(dir,fileName);

    try{
        fs.exists(file_path,function(exists) {
            if(!exists) {
                mySendreq(res , path.resolve(setting.img404));
                //res.json({'success':false,'message':'Image dont exists！'});
            } else {
                if (size.length < 2){  // 不需要缩放
                    mySendreq(res,file_path);
                }
                else{
                    // 已缩放的图片
                    var extname = path.extname(fileName);
                    var sfImg_path = dir + fileName.replace(extname,"_") + strUrl[0] + extname;
                    sfImg_path = path.resolve(sfImg_path);
                    fs.exists(sfImg_path,function(exists2) {
                        if(!exists2){
                            var width = parseInt(size[0]);
                            var height = parseInt(size[1]); 
                            var gm = gmglobe(file_path);                    
                            if (width > 0 && height > 0) {
                                gm.resize(width, height); 
                            }  

                            gm.write(sfImg_path , function(err){
                                if (err) {
                                    sendMail(err,req,res);
                                    return res.json({'success':false,'message':err});
                                }else{
                                    mySendreq(res,sfImg_path);
                                }
                            });
                        }else{
                            mySendreq(res,sfImg_path);
                        }
                    });
                }
            }
        }); 
    }
    catch(err){
        sendMail(err,req,res);
    };   
}

// 删除图片
exports.delimage = function (req,res){
    addheader(res,"DELETE");
    
    var url=req.url.replace("/Products/","");
    var strUrl = url.split("/");
    var size = strUrl[0].split("_");  // 100_100
    var fullname = strUrl[strUrl.length - 1]; // 取得文件的完整名字

    var extname = path.extname(fullname); // 扩展名
    var filename = fullname.replace(extname,""); // 文件名

    var urlDir = size.length < 2 ? url :url.replace(strUrl[0],"");
    var dir = setting.image_dir + urlDir.replace(fullname,"");
    fs.readdir(dir, function(err,files){
        if (err) {
            sendMail(err,req,res);
            return res.json({'success':false,'message':err});
        }else{
            for (var i = 0 ; i < files.length; i++) {
                // 遍历目录下面的文件            
                if(files[i].indexOf(filename)>-1 && path.extname(files[i]) == extname){
                    // 文件中名称中包含的需要删除的文件名字,不同分辨率的文件.  并且后缀名相同
                    fs.unlinkSync(dir + files[i]);
                }
            }

            deldir(dir.substring(0 , dir.length-1));
            return res.json({'success':true,'message':"Delete Image Successfully!"});
        }
    });
}

// 递归 删除目录
function deldir(mypath){
    if((mypath + "/") == setting.image_dir){
        return; // 在根图片目录下,不再删除
    }

    if(fs.readdirSync(mypath).length){
        return; // 文件夹不为空,不能删除        
    }else{
        fs.rmdirSync(mypath);
        deldir(mypath.substr(0 , mypath.lastIndexOf("/")));
    }
}

// 根据图片路径查询改路径下的所有图片，及目录
exports.listfiles = function (req,res){
    addheader(res,"POST");
    try{
        var mypath = req.query.path ? req.query.path : req.body.path; // 获取发送过来的查询 路径
        mypath = mypath ? mypath : "/";
        var imgDir = setting.image_dir;
        if(mypath){
            mypath = path.join(imgDir , mypath );  // 把相对路径添加成绝对路径
            fs.readdir(mypath, function(err, flies) {
                if (err){
                    sendMail(err,req,res);
                    return res.json({'success':false,'message':err});
                }   

                var retList = []; // 保存返回的结果
                for(var i = 0;i < flies.length; i++){
                    var stat = fs.statSync(mypath + flies[i]);
                    if (err){
                        sendMail(err,req,res);
                        return res.json({'success':false,'message':err});
                    }   

                    var fileInfo = {};
                    fileInfo.filename = flies[i];

                    if (stat && stat.isDirectory()) {
                        fileInfo.filetype = "dir"; // 目录类型
                    } else if (stat && stat.isFile()){
                        fileInfo.filetype = "file"; // 文件类型
                    }else{
                        fileInfo.filetype = "unknow"; // 其他类型
                    }
                    retList.push(fileInfo); 
                }

                return res.json({'success':true,'message':retList}); // 若目录是空的，返回空列表
            });
        }else{
            return res.json({'success':false,'message':"Please specify the path!"});
        }
    }
    catch(err){
        sendMail(err,req,res);
    };   
}
