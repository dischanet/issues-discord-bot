const util = require("util");
const Discord = require("discord.js");
const client = new Discord.Client();

require("date-utils");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("issues.db");
db.run(
  `CREATE TABLE IF NOT EXISTS issues(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id STRING,
  user STIRNG,
  title STRING,
  content STRING,
  status STRING,
  date STRING,
  update_at STRING)`
);

const dbGet = util.promisify((sql, arg, callback) =>
  db.get(sql, arg, callback)
);
const dbAll = util.promisify((sql, arg, callback) =>
  db.all(sql, arg, callback)
);
const dbRun = util.promisify((sql, arg, callback) =>
  db.run(sql, arg, callback)
);

const addCommand = async (message, cmd, callback) => {
  const args = message.content.match(cmd);
  if (!args) return;
  try {
    return await callback(args);
  } catch (error) {
    message.reply(`コマンド実行中にエラーが発生しました: ${error}`);
  }
};

const findArr = (arr, cmd) => {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] && arr[i].match(cmd)) return arr[i];
  }
};

const isOwner = message => {
  return message.author.id === message.channel.guild.ownerID;
};

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", message => {
  client.user.setGame("/issues help");
  // 説明表示
  addCommand(message, /^\/issues\shelp$/, () => {
    message.channel.send(
      `問題くんはGitHubのIssues風の問題点などをDiscordのサーバー内で管理できるBotです。
コマンド：
\`\`\`
/issues help    このメッセージを表示する
/issues log     問題の一覧を表示する
/issues submit  問題を投稿する
/issues show    問題の詳細を表示する
/issues close   問題を閉じる
/issues open    問題を開く
\`\`\`
それぞれのコマンドの詳細はこちらを参照してください。
https://github.com/yuta0801/issues-kun/wiki/Command`
    );
  });

  // 一覧
  addCommand(
    message,
    /^\/issues\slog(\s(open|closed))?(\s([^#]{2,32}#\d{4}))?$/,
    async msg => {
      const list = [];
      const rows = await dbAll(
        "SELECT user, status FROM issues WHERE guild_id=?",
        [message.channel.guild.id]
      );
      const args = [msg[2], msg[4]],
        user = findArr(args, /^[^#]{2,32}#\d{4}$/),
        stats = findArr(args, /^(open|closed)$/);
      for (const doc of rows) {
        if (user && doc[0] !== user) continue;
        if ((stats && doc[1] !== stats) || (!stats && doc[1] !== "open"))
          continue;
        list.push(`\`${doc.id}\`  ${doc.title}  by ${doc.user}`);
      }
      message.channel.send(
        list.length > 0 ? list.join("\n") : "見つかりませんでした！"
      );
    }
  );

  // 投稿
  addCommand(
    message,
    /^\/issues\ssubmit\s(.{2,20})[\s\n]([\s\S]+)$/,
    async msg => {
      await dbRun(
        "INSERT INTO issues(user,title,content,status,date) VALUES(?,?,?,?,?)",
        [message.author.tag, msg[1], msg[2], "open", new Date()]
      );
      message.channel.send("投稿しました。");
    }
  );

  // 修正
  addCommand(
    message,
    /^\/issues\srevise\s(\d+)\s(.{2,20})[\s\n]([\s\S]+)$/,
    async msg => {
      const row = await dbGet("SELECT user FROM issues WHERE id=?", [msg[1]]);

      if (!isOwner(message) && message.author.tag !== row[0]) {
        message.channel.send(
          "サーバーのオーナー以外は他人の投稿した問題を閉じることはできません！"
        );
        return;
      }
      await dbRun(
        "UPDATE issues SET user=?, title=?, content=?, status=?, update_at=?",
        [message.author.tag, msg[2], msg[3], "open", new Date()]
      );
      message.channel.send(`\`${msg[1]}\`を変更しました。`);
    }
  );

  // 表示
  addCommand(message, /^\/issues\sshow\s(\d+)$/, async msg => {
    const row = await dbGet(
      "SELECT id, title, content, user, status, date FROM issues WHERE id=?",
      [msg[1]]
    );
    message.channel.send(
      `\`${row[0]}\`  ${row[1]}

${row[2]}

by ${row[3]}  ${row[4]}  ${row[5]}`
    );
  });

  // 閉じる
  addCommand(message, /^\/issues\sclose\s(\d+)$/, async msg => {
    const row = dbGet("SELECT user FROM issues WHERE id=?", [msg[1]]);
    if (!isOwner(message) && message.author.tag !== row[0]) {
      message.channel.send(
        "サーバーのオーナー以外は他人の投稿した問題を閉じることはできません！"
      );
      return;
    }
    await dbRun("UPDATE issues SET status=?", ["closed"]);
    message.channel.send(`\`${msg[1]}\`を閉じました。`);
  });

  // 開く
  addCommand(message, /^\/issues\sopen\s(\d+)$/, async msg => {
    const row = await dbGet("SELECT user FROM issues WHERE id=?", [msg[1]]);
    if (!isOwner(message) && message.author.tag !== row[0]) {
      message.channel.send(
        "サーバーのオーナー以外は他人の投稿した問題を閉じることはできません！"
      );
      return;
    }
    await dbRun("UPDATE issues SET status=?", ["open"]);
    message.channel.send(`\`${msg[1]}\`を開きました。`);
  });
});

client.login(process.env.DISCORD_BOT_TOKEN);

// function makeId(arr) {
//   const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
//   let r = "";
//   for (let i = 0; i < 8; i++) {
//     r += c[Math.floor(Math.random() * c.length)];
//   }
//   return arr.includes(r) ? makeId(arr) : r;
// }
