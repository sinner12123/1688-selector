// 中文关键词 → 英文（海外平台搜索用）
// 优先内置词库（离线可靠），兜底走免费在线翻译（国内可能超时，故以词库为主）
const DICT = {
  // ===== 手机数码 =====
  '手机壳': 'phone case', '手机贴膜': 'screen protector', '手机膜': 'screen protector',
  '钢化膜': 'tempered glass', '手机支架': 'phone stand', '手机': 'phone',
  '手机链': 'phone strap', '手机挂绳': 'phone lanyard', '手机腕带': 'phone wrist strap',
  '自拍杆': 'selfie stick', '充电宝': 'power bank', '移动电源': 'power bank',
  '充电器': 'charger', '数据线': 'usb cable', '充电线': 'charging cable',
  '无线充电器': 'wireless charger', '无线充电': 'wireless charger', '快充': 'fast charger',
  '车载充电器': 'car charger', '插头': 'plug', '转换插头': 'travel adapter',
  '排插': 'power strip', '插座': 'socket', '耳机': 'earphones',
  '蓝牙耳机': 'bluetooth earphones', '有线耳机': 'wired earphones', '头戴式耳机': 'headphones',
  '耳塞': 'earbuds', '音箱': 'speaker', '蓝牙音箱': 'bluetooth speaker',
  '智能音箱': 'smart speaker', '智能手表': 'smart watch', '手表': 'watch',
  '手环': 'fitness band', '智能手环': 'fitness band', '表带': 'watch strap',
  '平板': 'tablet', '平板电脑': 'tablet', '平板保护壳': 'tablet case',
  '笔记本电脑': 'laptop', '笔记本': 'notebook', '电脑': 'laptop', '键盘': 'keyboard',
  '机械键盘': 'mechanical keyboard', '鼠标': 'mouse', '无线鼠标': 'wireless mouse',
  '摄像头': 'webcam', '麦克风': 'microphone', '直播设备': 'live streaming equipment',
  '补光灯': 'ring light', '直播灯': 'ring light', '三脚架': 'tripod',
  '手机云台': 'phone gimbal', '无人机': 'drone', '遥控车': 'remote control car',
  '游戏手柄': 'game controller', '游戏机': 'game console', '掌机': 'handheld console',
  '读卡器': 'card reader', 'U盘': 'usb flash drive', '硬盘': 'hard drive',
  '移动硬盘': 'portable hard drive', '内存卡': 'memory card', '存储': 'storage',
  '路由器': 'router', '蓝牙适配器': 'bluetooth adapter', '车载蓝牙': 'car bluetooth',
  '车载支架': 'car phone mount', '行车记录仪': 'dash cam', '电子书': 'e-reader',
  '充电座': 'charging dock', '充电支架': 'charging stand', '数据线收纳': 'cable organizer',
  // ===== 电脑办公 =====
  '显示器': 'monitor', '显示器支架': 'monitor stand', '键鼠套装': 'keyboard mouse combo',
  '鼠标垫': 'mouse pad', '键盘膜': 'keyboard cover', '笔记本支架': 'laptop stand',
  '电脑包': 'laptop bag', '电脑保护套': 'laptop sleeve', '桌面收纳': 'desk organizer',
  '办公': 'office', '打印机': 'printer', '投影仪': 'projector',
  '会议': 'meeting', '白板': 'whiteboard', '计算器': 'calculator',
  '文件架': 'file organizer', '书立': 'bookends', '笔筒': 'pen holder',
  '名片夹': 'business card holder', '文件夹': 'folder', '订书机': 'stapler',
  // ===== 影音娱乐 =====
  '电视': 'tv', '电视支架': 'tv mount', '投影仪幕布': 'projector screen',
  '蓝牙接收器': 'bluetooth receiver', '蓝牙发射器': 'bluetooth transmitter',
  '耳机收纳': 'headphone case', '耳机架': 'headphone stand', '唱片机': 'record player',
  '收音机': 'radio', '卡拉ok': 'karaoke', '麦克风支架': 'microphone stand',
  // ===== 智能家居 =====
  '智能家居': 'smart home', '智能灯': 'smart light', '智能插座': 'smart plug',
  '智能开关': 'smart switch', '智能门锁': 'smart lock', '智能门铃': 'smart doorbell',
  '摄像头监控': 'security camera', '监控摄像头': 'security camera', '门磁': 'door sensor',
  '温湿度计': 'thermometer hygrometer', '智能窗帘': 'smart curtains', '扫地机器人': 'robot vacuum',
  '空气净化器': 'air purifier', '加湿器': 'humidifier', '香薰机': 'aroma diffuser',
  '香薰': 'aromatherapy', '香薰蜡烛': 'scented candle', '精油': 'essential oil',
  '小夜灯': 'night light', '夜灯': 'night light', '氛围灯': 'ambient light',
  '灯带': 'led strip', '灯泡': 'light bulb', '台灯': 'desk lamp',
  '落地灯': 'floor lamp', '壁灯': 'wall lamp', '吊灯': 'pendant light',
  // ===== 家居生活 =====
  '家居': 'home', '生活用品': 'daily necessities', '收纳盒': 'storage box',
  '收纳': 'storage organizer', '收纳柜': 'storage cabinet', '衣架': 'clothes hanger',
  '挂钩': 'hooks', '粘钩': 'adhesive hooks', '置物架': 'shelf',
  '鞋架': 'shoe rack', '鞋盒': 'shoe box', '衣柜收纳': 'closet organizer',
  '床品': 'bedding', '床单': 'bed sheet', '被套': 'duvet cover',
  '枕头': 'pillow', '枕套': 'pillowcase', '被子': 'quilt',
  '毛毯': 'blanket', '电热毯': 'electric blanket', '床垫': 'mattress',
  '抱枕': 'throw pillow', '靠垫': 'cushion', '地毯': 'rug',
  '地垫': 'floor mat', '门垫': 'door mat', '浴垫': 'bath mat',
  '窗帘': 'curtains', '窗帘杆': 'curtain rod', '桌布': 'tablecloth',
  '桌垫': 'table mat', '餐垫': 'placemat', '墙贴': 'wall stickers',
  '墙纸': 'wallpaper', '挂画': 'wall art', '相框': 'photo frame',
  '镜子': 'mirror', '全身镜': 'full length mirror', '梳妆镜': 'vanity mirror',
  '时钟': 'clock', '闹钟': 'alarm clock', '挂钟': 'wall clock',
  '垃圾桶': 'trash can', '脏衣篮': 'laundry basket', '洗衣袋': 'laundry bag',
  '晾衣架': 'drying rack', '熨斗': 'iron', '粘毛器': 'lint roller',
  '真空收纳袋': 'vacuum storage bags', '干燥剂': 'desiccant', '除湿盒': 'dehumidifier box',
  '驱蚊器': 'mosquito repellent', '驱虫': 'pest repellent', '香包': 'sachet',
  '雨伞': 'umbrella', '雨衣': 'raincoat', '拖鞋': 'slippers',
  '浴室': 'bathroom', '毛巾': 'towel', '浴巾': 'bath towel',
  '牙刷': 'toothbrush', '牙线': 'dental floss', '洗漱杯': 'toothbrush holder',
  '肥皂盒': 'soap dish', '纸巾盒': 'tissue box', '垃圾桶': 'trash bin',
  // ===== 厨房餐饮 =====
  '厨房': 'kitchen', '厨房用品': 'kitchen supplies', '餐具': 'tableware',
  '碗': 'bowl', '盘子': 'plate', '筷子': 'chopsticks',
  '勺子': 'spoon', '叉子': 'fork', '刀': 'knife',
  '菜刀': 'kitchen knife', '砧板': 'cutting board', '锅': 'pot',
  '平底锅': 'frying pan', '炒锅': 'wok', '奶锅': 'milk pan',
  '电饭煲': 'rice cooker', '空气炸锅': 'air fryer', '烤箱': 'oven',
  '微波炉': 'microwave', '榨汁机': 'juicer', '破壁机': 'blender',
  '咖啡机': 'coffee maker', '咖啡': 'coffee', '水壶': 'kettle',
  '电热水壶': 'electric kettle', '保温杯': 'thermos', '水杯': 'water bottle',
  '杯子': 'cup', '马克杯': 'mug', '玻璃杯': 'glass cup',
  '酒杯': 'wine glass', '茶具': 'tea set', '茶壶': 'teapot',
  '饭盒': 'lunch box', '便当盒': 'lunch box', '保鲜盒': 'food storage container',
  '密封罐': 'storage jar', '调味瓶': 'spice jar', '油壶': 'oil dispenser',
  '锅铲': 'spatula', '漏勺': 'strainer', '削皮器': 'peeler',
  '开瓶器': 'bottle opener', '开罐器': 'can opener', '冰块模具': 'ice cube tray',
  '烘焙': 'baking', '蛋糕模具': 'cake mold', '裱花袋': 'piping bag',
  '厨房秤': 'kitchen scale', '温度计': 'thermometer', '围裙': 'apron',
  // ===== 美妆个护 =====
  '美妆': 'cosmetics', '化妆品': 'cosmetics', '化妆包': 'makeup bag',
  '化妆刷': 'makeup brush', '化妆刷套装': 'makeup brush set', '化妆镜': 'makeup mirror',
  '口红': 'lipstick', '唇膏': 'lip balm', '唇釉': 'lip gloss',
  '眼影': 'eyeshadow', '眼线笔': 'eyeliner', '睫毛膏': 'mascara',
  '假睫毛': 'false eyelashes', '眉笔': 'eyebrow pencil', '腮红': 'blush',
  '粉底': 'foundation', '粉底液': 'foundation', '遮瑕': 'concealer',
  '散粉': 'loose powder', '美妆蛋': 'makeup sponge', '粉扑': 'powder puff',
  '指甲油': 'nail polish', '美甲': 'nail art', '美甲灯': 'nail lamp',
  '美甲贴': 'nail stickers', '卸妆': 'makeup remover', '卸妆棉': 'cotton pads',
  '洗面奶': 'facial cleanser', '面膜': 'face mask', '护肤': 'skincare',
  '精华': 'serum', '乳液': 'lotion', '面霜': 'face cream',
  '防晒': 'sunscreen', '眼霜': 'eye cream', '美容仪': 'beauty device',
  '洁面仪': 'facial cleansing brush', '按摩': 'massage', '按摩器': 'massager',
  '假发': 'wig', '发饰': 'hair accessories', '发圈': 'hair ties',
  '发夹': 'hair clips', '发带': 'headband', '梳子': 'comb',
  '卷发棒': 'curling iron', '直发器': 'hair straightener', '吹风机': 'hair dryer',
  '剃须刀': 'razor', '电动牙刷': 'electric toothbrush', '指甲刀': 'nail clipper',
  '耳勺': 'ear pick', '挖耳勺': 'ear cleaner', '身体乳': 'body lotion',
  // ===== 服饰鞋包 =====
  '衣服': 'clothes', '服装': 'clothing', '女装': 'women clothing',
  '男装': 'men clothing', '童装': 'kids clothing', '上衣': 'tops',
  'T恤': 't-shirt', '衬衫': 'shirt', '卫衣': 'hoodie',
  '外套': 'jacket', '羽绒服': 'down jacket', '风衣': 'trench coat',
  '大衣': 'coat', '毛衣': 'sweater', '连衣裙': 'dress',
  '裙子': 'skirt', '裤子': 'pants', '牛仔裤': 'jeans',
  '短裤': 'shorts', '运动裤': 'sweatpants', '内衣': 'underwear',
  '内裤': 'underwear', '文胸': 'bra', '睡衣': 'pajamas',
  '睡袍': 'bathrobe', '泳衣': 'swimsuit', '比基尼': 'bikini',
  '袜子': 'socks', '丝袜': 'stockings', '打底裤': 'leggings',
  '帽子': 'hat', '棒球帽': 'baseball cap', '毛线帽': 'beanie',
  '围巾': 'scarf', '手套': 'gloves', '腰带': 'belt',
  '鞋子': 'shoes', '运动鞋': 'sneakers', '高跟鞋': 'high heels',
  '凉鞋': 'sandals', '拖鞋': 'slippers', '靴子': 'boots',
  '鞋垫': 'insoles', '鞋带': 'shoelaces', '包': 'bag',
  '背包': 'backpack', '双肩包': 'backpack', '单肩包': 'shoulder bag',
  '手提包': 'handbag', '斜挎包': 'crossbody bag', '钱包': 'wallet',
  '卡包': 'card holder', '行李箱': 'luggage', '行李袋': 'duffel bag',
  '化妆包': 'cosmetic bag', '零钱包': 'coin purse', '钥匙包': 'key pouch',
  // ===== 珠宝配饰 =====
  '首饰': 'jewelry', '珠宝': 'jewelry', '项链': 'necklace',
  '耳环': 'earrings', '耳钉': 'earrings', '戒指': 'ring',
  '手链': 'bracelet', '手镯': 'bangle', '脚链': 'anklet',
  '胸针': 'brooch', '发簪': 'hairpin', '发卡': 'hairpin',
  '银饰': 'silver jewelry', '合金': 'alloy jewelry', '锁骨链': 'choker',
  '吊坠': 'pendant', '情侣': 'couple', '定制': 'customized',
  '太阳镜': 'sunglasses', '眼镜': 'glasses', '眼镜框': 'eyeglass frames',
  '眼镜盒': 'glasses case', '墨镜': 'sunglasses', '眼镜链': 'glasses chain',
  // ===== 母婴用品 =====
  '母婴': 'baby products', '婴儿': 'baby', '宝宝': 'baby',
  '尿布': 'diapers', '尿不湿': 'diapers', '纸尿裤': 'diapers',
  '奶瓶': 'baby bottle', '奶嘴': 'pacifier', '奶瓶刷': 'bottle brush',
  '婴儿车': 'stroller', '婴儿床': 'baby crib', '婴儿背带': 'baby carrier',
  '婴儿餐椅': 'high chair', '婴儿玩具': 'baby toys', '磨牙棒': 'teether',
  '围兜': 'bib', '婴儿湿巾': 'baby wipes', '婴儿浴盆': 'baby bathtub',
  '孕妇': 'maternity', '孕妇装': 'maternity clothes', '哺乳': 'breastfeeding',
  '婴儿爬行垫': 'play mat', '婴儿睡袋': 'baby sleeping bag', '婴儿温度计': 'baby thermometer',
  // ===== 玩具 =====
  '玩具': 'toys', '积木': 'building blocks', '拼图': 'puzzle',
  '毛绒玩具': 'plush toy', '玩偶': 'doll', '娃娃': 'doll',
  '手办': 'action figure', '模型': 'model', '遥控飞机': 'remote control plane',
  '遥控船': 'remote control boat', '拼装玩具': 'building toy', '磁力片': 'magnetic tiles',
  '益智玩具': 'educational toy', '早教': 'early education', '减压玩具': 'fidget toy',
  '解压玩具': 'fidget toy', '陀螺': 'spinning top', '泡泡机': 'bubble machine',
  '风筝': 'kite', '沙滩玩具': 'beach toys', '儿童车': 'kids ride-on',
  '滑板车': 'scooter', '溜溜球': 'yoyo', '橡皮泥': 'play dough',
  '彩泥': 'modeling clay', '水晶泥': 'slime', '儿童画板': 'kids drawing board',
  // ===== 运动户外 =====
  '运动': 'sports', '健身': 'fitness', '瑜伽': 'yoga',
  '瑜伽垫': 'yoga mat', '瑜伽服': 'yoga wear', '瑜伽砖': 'yoga block',
  '哑铃': 'dumbbell', '杠铃': 'barbell', '跳绳': 'jump rope',
  '拉力器': 'resistance band', '弹力带': 'resistance band', '健腹轮': 'ab roller',
  '俯卧撑架': 'push up bars', '护膝': 'knee pads', '护腕': 'wrist support',
  '运动护具': 'sports protection', '运动水壶': 'sports water bottle', '运动毛巾': 'sports towel',
  '跑步': 'running', '骑行': 'cycling', '自行车': 'bicycle',
  '山地车': 'mountain bike', '电动车': 'electric scooter', '滑板': 'skateboard',
  '轮滑': 'roller skates', '溜冰鞋': 'roller skates', '帐篷': 'tent',
  '睡袋': 'sleeping bag', '防潮垫': 'sleeping pad', '野餐垫': 'picnic mat',
  '露营': 'camping', '登山': 'hiking', '登山杖': 'trekking pole',
  '登山包': 'hiking backpack', '户外': 'outdoor', '钓鱼': 'fishing',
  '渔具': 'fishing gear', '鱼竿': 'fishing rod', '鱼线': 'fishing line',
  '鱼饵': 'fishing bait', '钓箱': 'fishing box', '浮漂': 'fishing float',
  '望远镜': 'binoculars', '指南针': 'compass', '登山鞋': 'hiking shoes',
  '运动鞋垫': 'sports insoles', '球类': 'balls', '足球': 'soccer ball',
  '篮球': 'basketball', '排球': 'volleyball', '羽毛球': 'badminton',
  '乒乓球': 'table tennis', '网球': 'tennis', '高尔夫': 'golf',
  '泳镜': 'swimming goggles', '泳帽': 'swim cap', '救生衣': 'life jacket',
  // ===== 汽车配件 =====
  '汽车配件': 'car accessories', '汽车': 'car', '车载': 'car',
  '车载手机架': 'car phone holder', '车载充电': 'car charger', '车载吸尘器': 'car vacuum',
  '车载冰箱': 'car refrigerator', '车用香薰': 'car air freshener', '车载香水': 'car fragrance',
  '座垫': 'seat cushion', '座套': 'car seat cover', '方向盘套': 'steering wheel cover',
  '脚垫': 'car floor mats', '遮阳挡': 'car sunshade', '车衣': 'car cover',
  '雨刮器': 'wiper blades', '车贴': 'car stickers', '汽车贴膜': 'car window film',
  '车牌框': 'license plate frame', '钥匙套': 'car key cover', '车钥匙套': 'key fob cover',
  '应急电源': 'jump starter', '充气泵': 'air pump', '胎压监测': 'tire pressure monitor',
  '摩托车': 'motorcycle', '头盔': 'helmet', '摩托车手套': 'motorcycle gloves',
  '摩托配件': 'motorcycle accessories', '后视镜': 'mirror', '车灯': 'car light',
  // ===== 宠物用品 =====
  '宠物': 'pet', '宠物用品': 'pet supplies', '猫': 'cat',
  '狗': 'dog', '猫粮': 'cat food', '狗粮': 'dog food',
  '猫砂': 'cat litter', '猫砂盆': 'cat litter box', '猫窝': 'cat bed',
  '狗窝': 'dog bed', '狗绳': 'dog leash', '牵引绳': 'leash',
  '项圈': 'collar', '胸背带': 'dog harness', '宠物衣服': 'pet clothes',
  '猫玩具': 'cat toys', '狗玩具': 'dog toys', '逗猫棒': 'cat wand',
  '宠物碗': 'pet bowl', '喂食器': 'pet feeder', '饮水器': 'pet water fountain',
  '宠物梳子': 'pet brush', '指甲剪': 'nail clippers', '宠物背包': 'pet carrier',
  '猫抓板': 'cat scratching board', '猫爬架': 'cat tree', '宠物床': 'pet bed',
  '鱼缸': 'aquarium', '水族': 'aquarium', '鱼食': 'fish food',
  '鸟笼': 'bird cage', '仓鼠': 'hamster', '兔笼': 'rabbit cage',
  // ===== 文具 =====
  '文具': 'stationery', '笔': 'pen', '钢笔': 'fountain pen',
  '铅笔': 'pencil', '彩笔': 'colored pens', '马克笔': 'marker',
  '荧光笔': 'highlighter', '蜡笔': 'crayon', '橡皮': 'eraser',
  '尺子': 'ruler', '剪刀': 'scissors', '胶水': 'glue',
  '胶带': 'tape', '便利贴': 'sticky notes', '贴纸': 'sticker',
  '手账': 'journal', '手帐': 'journal', '日记本': 'diary',
  '便签': 'note pad', '书签': 'bookmark', '回形针': 'paper clips',
  '订书针': 'staples', '修正带': 'correction tape', '铅笔盒': 'pencil case',
  '书包': 'school bag', '画板': 'drawing board', '颜料': 'paint',
  '画笔': 'paint brush', '画纸': 'drawing paper', '手工': 'diy crafts',
  '十字绣': 'cross stitch', '数字油画': 'paint by numbers', '串珠': 'beads',
  '编织': 'knitting', '刺绣': 'embroidery', '钻石画': 'diamond painting',
  // ===== 节日派对 =====
  '圣诞': 'christmas', '圣诞装饰': 'christmas decorations', '圣诞树': 'christmas tree',
  '圣诞袜': 'christmas stocking', '圣诞老人': 'santa claus', '彩灯': 'string lights',
  '万圣节': 'halloween', '万圣节装饰': 'halloween decorations', '派对用品': 'party supplies',
  '生日': 'birthday', '生日装饰': 'birthday decorations', '气球': 'balloons',
  '蜡烛': 'candle', '蛋糕装饰': 'cake decorations', '彩带': 'ribbon',
  '节日': 'holiday', '新年': 'new year', '春节': 'chinese new year',
  '红包': 'red envelope', '灯笼': 'lantern', '派对帽': 'party hats',
  // ===== 通用修饰词 =====
  '透明': 'transparent', '磁吸': 'magnetic', '硅胶': 'silicone',
  '防摔': 'shockproof', '全包': 'full coverage', '无线': 'wireless',
  '蓝牙': 'bluetooth', '智能': 'smart', '迷你': 'mini',
  '便携': 'portable', '多功能': 'multifunctional', '新款': 'new',
  '升级款': 'upgraded', '防水': 'waterproof', '折叠': 'foldable',
  '大容量': 'large capacity', '可爱': 'cute', '儿童': 'kids',
  '女士': 'women', '男士': 'men', '户外': 'outdoor',
  '家用': 'home use', '商用': 'commercial', '高档': 'premium',
  '豪华': 'luxury', '简约': 'minimalist', '北欧风': 'nordic style',
  'ins风': 'instagram style', '韩版': 'korean style', '日式': 'japanese style',
  '复古': 'vintage', '时尚': 'fashionable', '创意': 'creative',
  '个性': 'personalized', '网红': 'trendy', '爆款': 'hot selling',
  '大号': 'large', '小号': 'small', '加厚': 'thickened',
  '加长': 'extended', '超薄': 'ultra thin', '高颜值': 'aesthetic',
  '实用': 'practical', '收纳': 'storage', '套装': 'set',
  '装饰': 'decoration', '装饰品': 'decorations', '树': 'tree', '灯': 'light',
  '黑色': 'black', '白色': 'white', '粉色': 'pink',
  '红色': 'red', '蓝色': 'blue', '绿色': 'green',
  '金色': 'gold', '银色': 'silver', '灰色': 'gray',
  '紫色': 'purple', '黄色': 'yellow', '橙色': 'orange',
  '棕色': 'brown', '彩色': 'colorful', '多色': 'multicolor',
  '木质': 'wooden', '不锈钢': 'stainless steel', '塑料': 'plastic',
  '玻璃': 'glass', '陶瓷': 'ceramic', '竹制': 'bamboo',
  '棉': 'cotton', '皮革': 'leather', '羊毛': 'wool',
  '真丝': 'silk', '帆布': 'canvas', '绒': 'fleece',
};

function hasChinese(s) { return /[\u4e00-\u9fff]/.test(s); }

// 词库翻译：先精确匹配；否则贪心最长匹配分词，词与词之间自动加空格
function translateByDict(text) {
  const t = String(text).trim();
  if (DICT[t]) return DICT[t];
  const keys = Object.keys(DICT).sort((a, b) => b.length - a.length);
  let result = '';
  let i = 0;
  while (i < t.length) {
    let matched = null;
    for (const k of keys) {
      if (t.startsWith(k, i)) { matched = k; break; }
    }
    if (matched) {
      result += (result && !/\s$/.test(result) ? ' ' : '') + DICT[matched];
      i += matched.length;
    } else {
      result += t[i];
      i++;
    }
  }
  return result.trim();
}

async function onlineTranslate(text) {
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=' + encodeURIComponent(text);
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  const en = ((data && data[0]) || []).map((s) => s[0]).join('');
  return en && !hasChinese(en) ? en.trim() : '';
}

async function zhToEn(text) {
  if (!text || !hasChinese(text)) return String(text || '');
  const viaDict = translateByDict(text);
  if (!hasChinese(viaDict)) return viaDict;
  try {
    const en = await onlineTranslate(text);
    if (en) return en;
  } catch {}
  return viaDict;
}

module.exports = { zhToEn, hasChinese };
