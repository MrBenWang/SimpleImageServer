var express=require("express");
var router=express.Router();

var file_ctrl = require('../controller/filectrl')

// 上传文件
router.options('/upload',file_ctrl.Verification);
router.post('/upload',file_ctrl.upload);

// 下载图片
router.get('/Products/*', file_ctrl.download);

// 删除图片
router.options('/Products/*', file_ctrl.Verification);
router.delete('/Products/*', file_ctrl.delimage);
router.delete('/*', file_ctrl.delimage);

// 根据图片路径，获取下面的文件
router.options('/listfiles',file_ctrl.Verification);
router.post('/listfiles',file_ctrl.listfiles);
router.get('/listfiles',file_ctrl.listfiles);

router.get('/*', file_ctrl.download);

module.exports = router;