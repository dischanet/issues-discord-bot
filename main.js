const Discord = require('discord.js'),
			client  = new Discord.Client(),
			mongo   = require('mongodb').MongoClient,
			level   = ['提案', '確認', '重要', '至急'];

let proposals = {};

client.on('ready', () => {
	console.log('I am ready!');
});

mongo.connect('mongodb://127.0.0.1:27017/issues', (error, db) => {
	client.on('message', message => {
		// 説明表示
		addCommand(message, /^>問題くん$/, msg => {
			message.channel.send(`
\`>投稿 タイトル 重要度 内容\`
値と値の間の区切り文字は、
スペースやタブなどの空白文字でも構いません。
\`\`\`
タイトル
	スペースやタブなどの空白文字は含まないでください。
	また2文字以上、20文字以内でお書きください。
重要度
	${level.join('\n\t')}
内容
	改行しても構いません。
	自由にお書きください。
\`\`\``);
		});

		// 初期設定
		addCommand(message, /^>初期設定$/, msg => {
			db[message.channel.guild.id].drop();
			db.createCollection(message.channel.guild.id, () => {
				console.log('初期化しました。');
			});
		});

		// 一覧表示
		addCommand(message, /^>一覧/, msg => {
			let list = [], collection = db.collection(message.channel.guild.id);
			collection.find().toArray((err, docs) => {
				for (let doc of docs) {
					if (doc.status) {
						list.push(`\`${doc.id}\`  ${level[doc.level]}  ${doc.title}  by ${doc.user}`);
					}
				}
				message.channel.send(list.join('\n'));
			});
		});

		// 投稿する
		addCommand(message, /^>投稿\s(.{2,20})\s(\d)[\s\n]([\s\S]+)$/, msg => {
			let collection = db.collection(message.channel.guild.id);
			collection.find().toArray((err, docs) => {
				let ids = [];
				for (let doc of docs) ids.push(doc.id);
				collection.insertOne({
					id:      makeId(ids),
					user:    message.author.tag,
					title:   msg[1],
					level:   msg[2],
					content: msg[3],
					status:  true
				}, (error, result) => {
					message.channel.send((error) ? 'エラー：'+error : '追加されました。');
				});
			});
		});

		addCommand(message, /^>完了\s([a-zA-Z0-9]{8})$/, msg => {
			let collection = db.collection(message.channel.guild.id);
			collection.updateOne({id:msg[1]}, {$set: {status: false}}, (err, result) => {
				message.channel.send((error) ? 'エラー：'+error : `\`${msg[1]}\`の状態を完了にしました。`);
			});
		});
	});
});

client.login('MzM4Mjg1NDgxNTQ2NzQzODA4.DFTMaw.utI-HFYjpbt8Cu7pzb2S5hdfsHg');

function makeId(arr) {
	let c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', r = '';
	for(let i=0; i<8; i++){
		r += c[Math.floor(Math.random()*c.length)];
	}
	return (arr.includes(r)) ? makeId(arr) : r;
}

function addCommand(message, cmd, callback) {
	if (message.content.match(cmd)) callback(message.content.match(cmd));
}
