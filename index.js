const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const { exit } = require("process");

const client = new Discord.Client();

const queue = new Map();

function prompt(question, callback) {
  var stdin = process.stdin,
      stdout = process.stdout;

  stdin.resume();
  stdout.write(question);

  stdin.once('data', function (data) {
      callback(data.toString().trim());
  });
}

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async message => {
  if (!message.content.startsWith(prefix)) return;
  if (message.content === `${prefix}clear`) {
    message.channel.send(`Type "yes" in console to confirm!`)
    prompt(`: `, function (input) {
      if (input === `yes`) {
        var channel_name = message.channel.name
        message.channel.delete()
        message.guild.channels.create(channel_name)
      } else return;
    })
  } else {
    if (message.channel.name === `bot`) {
      if (message.author.bot) return;
      if (!message.content.startsWith(prefix)) return;

      const serverQueue = queue.get(message.guild.id);

      if (message.content.startsWith(`${prefix}play `)) {
        execute(message, serverQueue);
        return;
      } else if (message.content === `${prefix}play`) {
          message.channel.send("Enter a link dumbass")
          return;
      } else if (message.content === `${prefix}help`) {
          help(message)
          return;
      } else if (message.content === `${prefix}skip`) {
        skip(message, serverQueue);
        return;
      } else if (message.content === `${prefix}stop`) {
        stop(message, serverQueue);
        return;
      } else if (message.content === `${prefix}shutdown`) {
            if (message.author.id === `587527999054807042`) {
                exit();
            } else {
                message.reply("You need to have permission to do that idiot.")
            }
      } else {
        message.channel.send("You need to enter a valid command!");
      }
    } else {
        message.delete()
    }
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
   };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
    
  if (!serverQueue)
    return message.channel.send("There is no song that I could stop!");
    
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

function help(message) {
    message.channel.send(`Current Prefix: ${prefix}`)
    message.channel.send(`Commands: ${prefix}help, ${prefix}play {URL}, ${prefix}stop, ${prefix}skip, ${prefix}shutdown, ${prefix}clear`)
}

client.login(token);