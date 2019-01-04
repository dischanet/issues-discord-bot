const Discord = require("discord.js"),
  client = new Discord.Client();

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
  update STRING`
);

const proposals = {};

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", (message) => {
  client.user.setGame("/issues help");
  // 説明表示
  addCommand(message, /^\/issues\shelp$/, (msg) => {
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
​それぞれのコマンドの詳細はこちらを参照してください。
https://github.com/yuta0801/issues-kun/wiki/Command`
    );
  });

  // id, guild_id, user, status
  // CREATE TABLE issues(
  // id INTEGER PRIMARY KEY AUTOINCREMENT,
  // guild_id STRING,
  // user STIRNG,
  // title STRING,
  // content STRING,
  // status STRING,
  // date STRING,
  // update STRING);

  // 一覧
  addCommand(
    message,
    /^\/issues\slog(\s(open|closed))?(\s([^#]{2,32}#\d{4}))?$/,
    (msg) => {
      const list = [];
      db.all(
        "SELECT user, status FROM issues WHERE guild_id=?",
        [message.channel.guild.id],
        (err, rows) => {
          if (err) return; // TODO
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
    }
  );

  // 投稿
  addCommand(message, /^\/issues\ssubmit\s(.{2,20})[\s\n]([\s\S]+)$/, (msg) => {
    db.run(
      "INSERT INTO issues(user,title,content,status,date) VALUES(?,?,?,?,?)",
      [message.author.tag, msg[1], msg[2], "open", new Date()],
      (error) => {
        message.channel.send(error ? `エラー：${error}` : "投稿しました。");
      }
    );
  });

  // 修正
  addCommand(
    message,
    /^\/issues\srevise\s(\d+)\s(.{2,20})[\s\n]([\s\S]+)$/,
    (msg) => {
      db.get("SELECT user FROM issues WHERE id=?", [msg[1]], (err, row) => {
        if (err) return; // TODO
        if (!isOwner(message) && message.author.tag !== doc.user) {
          message.channel.send(
            "サーバーのオーナー以外は他人の投稿した問題を閉じることはできません！"
          );
          return;
        }
        db.get(
          "UPDATE issues SET user=?, title=?, content=?, status=?, update=?",
          [message.author.tag, msg[2], msg[3], "open", new Date()],
          (error) => {
            message.channel.send(
              error ? `エラー：${error}` : `\`${msg[1]}\`を変更しました。`
            );
          }
        );
      });
    }
  );

  // 表示
  addCommand(message, /^\/issues\sshow\s(\d+)$/, (msg) => {
    db.get(
      "SELECT id, title, content, user, status, date FROM issues WHERE id=?",
      [msg[1]],
      (err, row) => {
        if (err) return; // TODO
        message.channel.send(
          `\`${row[0]}\`  ${row[1]}

${row[2]}

by ${row[3]}  ${row[4]}  ${row[5]}`
        );
      }
    );
  });

  // 閉じる
  addCommand(message, /^\/issues\sclose\s(\d+)$/, (msg) => {
    db.get("SELECT user FROM issues WHERE id=?", [msg[1]], (err, row) => {
      if (err) return; // TODO
      if (!isOwner(message) && message.author.tag !== doc.user) {
        message.channel.send(
          "サーバーのオーナー以外は他人の投稿した問題を閉じることはできません！"
        );
        return;
      }
      db.get("UPDATE issues SET status=?", ["closed"], (error) => {
        message.channel.send(
          error ? `エラー：${error}` : `\`${msg[1]}\`を閉じました。`
        );
      });
    });
  });

  // 開く
  addCommand(message, /^\/issues\sopen\s([a-zA-Z0-9]{8})$/, (msg) => {
    db.get("SELECT user FROM issues WHERE id=?", [msg[1]], (err, row) => {
      if (err) return; // TODO
      if (!isOwner(message) && message.author.tag !== doc.user) {
        message.channel.send(
          "サーバーのオーナー以外は他人の投稿した問題を閉じることはできません！"
        );
        return;
      }
      db.get("UPDATE issues SET status=?", ["open"], (error) => {
        message.channel.send(
          error ? `エラー：${error}` : `\`${msg[1]}\`を開きました。`
        );
      });
    });
  });
});

client.login(process.env.DISCORD_BOT_TOKEN);

function makeId(arr) {
  const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let r = "";
  for (let i = 0; i < 8; i++) {
    r += c[Math.floor(Math.random() * c.length)];
  }
  return arr.includes(r) ? makeId(arr) : r;
}

function addCommand(message, cmd, callback) {
  if (message.content.match(cmd)) return callback(message.content.match(cmd));
}

function findArr(arr, cmd) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] && arr[i].match(cmd)) return arr[i];
  }
}

function isOwner(message) {
  return message.author.id === message.channel.guild.ownerID;
}
