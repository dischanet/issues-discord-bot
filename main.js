const Discord = require('discord.js'),
			client  = new Discord.Client(),
			mongo   = require('mongodb').MongoClient;

require('date-utils');

let proposals = {};

client.on('ready', () => {
	console.log('I am ready!');
});

mongo.connect('mongodb://localhost:27017/issues', (error, db) => {
	client.on('message', message => {
		// 説明表示
		addCommand(message, /^\/issues\shelp$/, msg => {
			message.channel.send(
`問題くんはそれぞれのDiscordのサーバー内でIssuesを管理できるBotです。
\`\`\`
​コマンド：
	/issues help    このメッセージを表示する
	/issues log     問題の一覧を表示する
	/issues submit  問題を投稿する
	/issues show    問題の詳細を表示する
	/issues close   問題を閉じる
\`\`\`
​それぞれのコマンドの詳細はこちらを参照してください。
https://github.com/yuta0801/issues-kun/wiki/Command`);
		});

		// 一覧
		addCommand(message, /^\/issues\slog(\s(open|closed))?(\s([^#]{2,32}#\d{4}))?$/, msg => {
			let list = [];
			db.createCollection(message.channel.guild.id, (err, collection) => {
				collection.find().toArray((err, docs) => {
					let args  = [msg[2], msg[4]],
							user  = findArr(args, /^[^#]{2,32}#\d{4}$/),
							stats = findArr(args, /^(open|closed)$/);
					for (let doc of docs) {
						if ( user  && doc.user   != user) continue;
						if ((stats && doc.status != stats) || (!stats && doc.status != 'open')) continue;
						list.push(`\`${doc.id}\`  ${doc.title}  by ${doc.user}`);
					}
					message.channel.send((list.length>0)?list.join('\n'):'見つかりませんでした！');
				});
			});
		});

		// 投稿
		addCommand(message, /^\/issues\ssubmit\s(.{2,20})[\s\n]([\s\S]+)$/, msg => {
			db.createCollection(message.channel.guild.id, (err, collection) => {
				collection.find().toArray((err, docs) => {
					let ids = [];
					for (let doc of docs) ids.push(doc.id);
					collection.insertOne({
						id:      makeId(ids),
						user:    message.author.tag,
						title:   msg[1],
						content: msg[2],
						status:  'open',
						date:    new Date(),
						update:  null
					}, (error, result) => {
						message.channel.send((error)?'エラー：'+error:'投稿しました。');
					});
				});
			});
		});

		// 修正
		addCommand(message, /^\/issues\srevise\s([a-zA-Z0-9]{8})\s(.{2,20})[\s\n]([\s\S]+)$/, msg => {
			db.createCollection(message.channel.guild.id, (err, collection) => {
				collection.findOne({id: msg[1]}, (err, doc) => {
					if (!isOwner(message) && (message.tag != doc.user)) return message.channel.send('サーバーのオーナー以外は他人の投稿した問題を閉じることはできません！');
					collection.updateOne({_id: doc._id}, {$set: {
						id:      makeId(ids),
						user:    message.author.tag,
						title:   msg[2],
						content: msg[3],
						status:  'open',
						update:  new Date()
					}}, (err, result) => {
						message.channel.send((error)?'エラー：'+error:`\`${msg[1]}\`を変更しました。`);
					});
				});
			});
		});

		// 表示
		addCommand(message, /^\/issues\sshow\s([a-zA-Z0-9]{8})$/, msg => {
			db.createCollection(message.channel.guild.id, (err, collection) => {
				collection.findOne({id: msg[1]}, (err, doc) => {
					message.channel.send(
`\`${doc.id}\`  ${doc.title}

${doc.content}

by ${doc.user}  ${doc.status}  ${doc.date.toFormat('YYYY/MM/DD HH24:MI:SS')}`);
				});
			});
		});

		// 閉じる
		addCommand(message, /^\/issues\sclose\s([a-zA-Z0-9]{8})$/, msg => {
			db.createCollection(message.channel.guild.id, (err, collection) => {
				collection.findOne({id: msg[1]}, (err, doc) => {
					if (!isOwner(message) && (message.tag != doc.user)) return message.channel.send('サーバーのオーナー以外は他人の投稿した問題を閉じることはできません！');
					collection.updateOne({_id: doc._id}, {$set: {status: 'closed'}}, (err, result) => {
						message.channel.send((error)?'エラー：'+error:`\`${msg[1]}\`を閉じました。`);
					});
				});
			});
		});

		// 開く
		addCommand(message, /^\/issues\sopen\s([a-zA-Z0-9]{8})$/, msg => {
			db.createCollection(message.channel.guild.id, (err, collection) => {
				collection.findOne({id: msg[1]}, (err, doc) => {
					if (!isOwner(message) && (message.tag != doc.user)) return message.channel.send('サーバーのオーナー以外は他人の投稿した問題を閉じることはできません！');
					collection.updateOne({_id: doc._id}, {$set: {status: 'open'}}, (err, result) => {
						message.channel.send((error)?'エラー：'+error:`\`${msg[1]}\`を開きました。`);
					});
				});
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

function findArr(arr, cmd) {
	for (var i=0; i<arr.length; i++) {
		if (arr[i] && arr[i].match(cmd)) return arr[i];
	}
}

function isOwner(message) {
	return message.user.id == message.channel.guild.ownerID;
}
