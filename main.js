const Discord = require('discord.js'),
			client  = new Discord.Client(),
			mongo   = require('mongodb').MongoClient,
			level   = ['提案', '*確認*', '**重要**', '***至急***'];

require('date-utils');

let proposals = {};

client.on('ready', () => {
	console.log('I am ready!');
});

mongo.connect('mongodb://localhost:27017/issues', (error, db) => {
	client.on('message', message => {
		// 説明表示
		addCommand(message, /^>help( (\w+))?$/, msg => {
			message.channel.send(
`問題くんはそれぞれのDiscordのサーバー内でIssuesを管理できるBotです。
\`\`\`
​コマンド：
	>help    このメッセージを表示する
	>init    初期設定を行う
	>log     問題の一覧を表示する
	>submit  問題を投稿する
	>show    問題の詳細を表示する
	>close   問題を閉じる
	>issue   問題くんの問題を報告する
\`\`\`
​コマンドの詳細はこちらを参照してください。
https://github.com/yuta0801/issues-kun/wiki/Command`);
		});

		// 初期設定
		addCommand(message, /^>init$/, msg => {
			db.createCollection(message.channel.guild.id, (err, collection) => {
				message.channel.send((error)?'エラー：'+error:'初期設定が完了しました。');
			});
		});

		// 一覧表示
		addCommand(message, /^>log( ([0-3]))?( (open|closed))?( ([^#]{2,32}#\d{4})))$?/, msg => {
			let list = [], collection = db.collection(message.channel.guild.id);
			collection.find().toArray((err, docs) => {
				for (let doc of docs) {
					if (msg[2] && doc.level != msg[2]) return;
					if ((msg[4] && doc.status != msg[4]) || (!msg[4] && doc.status != 'open')) return;
					if (msg[6] && doc.level != msg[6]) return;
					list.push(`\`${doc.id}\`  ${level[doc.level]}  ${doc.title}  by ${doc.user}`);
				}
				message.channel.send((list.length>0)?list.join('\n'):'見つかりませんでした！');
			});
		});

		// 投稿する
		addCommand(message, /^>submit (.{2,20}) ([0-3])[ \n]([\s\S]+)$/, msg => {
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
					status:  'open',
					date:    new Date()
				}, (error, result) => {
					message.channel.send((error)?'エラー：'+error:'投稿しました。');
				});
			});
		});

		addCommand(message, /^>show ([a-zA-Z0-9]{8})$/, msg => {
			let collection = db.collection(message.channel.guild.id);
			collection.findOne({id: msg[1]}, (err, doc) => {
				console.log(doc);
				message.channel.send(
`\`${doc.id}\`  ${level[doc.level]}  ${doc.title}

${doc.content}

by ${doc.user}  ${doc.status}  ${doc.date.toFormat('YYYY/MM/DD HH24:MI:SS')}`);
			});
		});

		addCommand(message, /^>close ([a-zA-Z0-9]{8})$/, msg => {
			let collection = db.collection(message.channel.guild.id);
			collection.updateOne({id: msg[1]}, {$set: {status: 'closed'}}, (err, result) => {
				message.channel.send((error)?'エラー：'+error:`\`${msg[1]}\`を完了状態にしました。`);
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
