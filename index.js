const express = require("express");
// const session = require("express-session");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 5000;
const REACT_APP_URL = process.env.REACT_APP_URL;
const PASSWORD = "fanchongxin";

// 中间件
app.use(
  cors({
    origin: "http://localhost:3000", // 前端地址
    // origin: "https://client-iota-rose.vercel.app", // 前端地址
    // origin: REACT_APP_URL, // 前端地址
    credentials: true, // 允许发送 cookies
  })
);
app.use(express.json()); // 解析 JSON 数据

// app.use(
//   session({
//     secret: "your-secret-key",
//     resave: false,
//     saveUninitialized: true,
//     store: MongoStore.create({
//       mongoUrl: `mongodb+srv://fancx29:${PASSWORD}@cluster0.shxhe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`,
//     }),
//     cookie: { secure: false }, // 在生产环境中应设置为 true，需使用 HTTPS
//   })
// );
// mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
// mongodb+srv://fancx29:${PASSWORD}@cluster0.shxhe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
// MongoDB 连接
mongoose
  .connect(
    `mongodb+srv://fancx29:${PASSWORD}@cluster0.shxhe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connect err", err));

// // 数据模型
// const DataSchema = new mongoose.Schema({
//   userId: String,
//   password: String,
//   lvl: String,
// });
// const User = mongoose.model("User", DataSchema);

// Basic route
app.get("/", (req, res) => {
  res.send("Hello, world!");
});

const UserSchema = new mongoose.Schema({
  userId: String,
  password: String,
  lvl: Number,
  nickName: String,
});

const User = mongoose.model("User", UserSchema);

const MessageSchema = new mongoose.Schema({
  toUserId: String,
  fromUserId: String,
  message: String,
  updateDatetime: String,
});

const Message = mongoose.model("Message", MessageSchema);

// login
app.post("/api/login", async (req, res) => {
  const { userId, password } = req.body;

  try {
    const user = await User.findOne({ userId });
    console.log("Queried user:", user);
    if (!user) {
      return res.json({ message: "用户不存在" });
    }
    const user2 = await User.findOne({ userId, password });

    if (user2) {
      console.log("Queried user:", user2);
      // req.session.user = user2; // 将用户信息存入 session
      return res.json({ message: "登录成功", user });
    } else {
      return res.json({ message: "密码错误" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "服务器错误" });
  }
});

// 受保护的路由
app.get("/api/dashboard", (req, res) => {
  // console.log(req.session.user, "req.session.user");
  // if (req.session.user) {
  //   return res.json({
  //     message: `欢迎回来, ${req.session.user.userId}`,
  //     userId: req.session.user.userId,
  //   });
  // }

  res.json({ message: "未登录" });
});

// 查询给登录用户的message
app.post("/api/fetchMyMessage", async (req, res) => {
  const { toUserId } = req.body;

  try {
    const messages = await Message.find({ toUserId }).exec();
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "服务器错误" });
  }
});

// 登录message
app.post("/api/addMessage", async (req, res) => {
  const { toUserId, fromUserId, message } = req.body;

  try {
    const newMessage = new Message({
      toUserId,
      fromUserId,
      message,
      updateDatetime: new Date(),
    });

    const savedMessage = await newMessage.save();
    res.json({ message: "数据保存成功", data: savedMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "服务器错误" });
  }
});

// 添加user
app.post("/api/addUser", async (req, res) => {
  const { userId, password, lvl } = req.body;

  try {
    const newUser = new User({ userId, password, lvl });
    const savedUser = await newUser.save();
    res.json({ message: "数据保存成功", insertedId: savedUser._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "服务器错误" });
  }
});

// 查看user
app.get("/api/getUserList", async (req, res) => {
  try {
    console.log("getUserList START");
    const users = await User.find().exec();
    console.log("getUserList users", users);
    const result = users.map((item) => ({
      value: item.userId,
      label: item.nickName,
    }));
    console.log("getUserList result", result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "服务器错误" });
  }
});

// 查看user
app.get("/api/getUsers", async (req, res) => {
  try {
    console.log("getUsers START");
    const users = await User.find().exec();
    console.log("getUsers users");
    res.json(users);
  } catch (err) {
    console.log("getUsers ERR", err);
    res.status(500).json({ message: "服务器错误" });
  }
});

app.get("/api/getNovel", async (req, res) => {
  try {
    const { lim, st } = req.query;
    // 调用函数拼接
    const url = buildUrlWithParams(
      `https://api.syosetu.com/novelapi/api/`,
      req.query
    );
    console.log("getNovel start!!", { query: req.query, url });

    const result = await axios.get(url);

    console.log("length:", result.data.length);
    // 将第三方 API 返回的 HTML 数据发送给前端
    res.json(result.data);
  } catch (error) {
    console.error("Error fetching HTML:", error);
    res.status(500).json("Error fetching data");
  }
});

app.get("/api/getNovelInfo", async (req, res) => {
  try {
    const { ncode } = req.query;
    // 调用函数拼接
    console.log("getNovelInfo start!!", {
      query: req.query,
      url: `https://ncode.syosetu.com/${ncode}`,
    });

    const response = await axios.get(`https://ncode.syosetu.com/${ncode}`);

    if (response.headers["content-type"].includes("text/html")) {
      res.send(response.data); // 直接将 HTML 数据发送给前端

      // const html = response.data;

      // const $ = cheerio.load(html); // 使用 cheerio 解析 HTML

      // // 假设你想提取页面中的标题
      // const title = $("title").text(); // 获取 <title> 标签中的内容
      // console.log(title, "title");

      // // 返回提取的内容
      // res.json({
      //   title,
      // });
    } else {
      res.status(400).json({ message: "The requested content is not HTML" });
    }
  } catch (error) {
    // console.error("Error fetching HTML:", error);
    res.status(500).json({ message: "Error occurred", error: error.message });
  }
});

app.get("/api/getNovelEpInfo", async (req, res) => {
  try {
    const { ep, ncode } = req.query;
    // 调用函数拼接
    console.log("getNovelInfo start!!", {
      query: req.query,
      url: `https://ncode.syosetu.com/${ncode}`,
    });

    const response = await axios.get(
      `https://ncode.syosetu.com/${ncode}/${ep}`
    );

    if (response.headers["content-type"].includes("text/html")) {
      res.send(response.data); // 直接将 HTML 数据发送给前端

      // const html = response.data;

      // const $ = cheerio.load(html); // 使用 cheerio 解析 HTML

      // // 假设你想提取页面中的标题
      // const title = $("title").text(); // 获取 <title> 标签中的内容
      // console.log(title, "title");

      // // 返回提取的内容
      // res.json({
      //   title,
      // });
    } else {
      res.status(400).json({ message: "The requested content is not HTML" });
    }
  } catch (error) {
    // console.error("Error fetching HTML:", error);
    res.status(500).json({ message: "Error occurred", error: error.message });
  }
});
// app.get("/api/getUsers", async (req, res) => {
//   // 直接使用 MongoDB 的原生方法查询数据
//   const data = await User.find().toArray();
//   res.json(data);
// });

function getCurrentTimeString() {
  const now = new Date();

  const yyyy = now.getFullYear(); // 获取4位年份
  const MM = String(now.getMonth() + 1).padStart(2, "0"); // 获取月份，注意要加1
  const DD = String(now.getDate()).padStart(2, "0"); // 获取日期
  const HH = String(now.getHours()).padStart(2, "0"); // 获取小时
  const mm = String(now.getMinutes()).padStart(2, "0"); // 获取分钟
  const ss = String(now.getSeconds()).padStart(2, "0"); // 获取秒

  return `${yyyy}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}

function buildUrlWithParams(baseUrl, params) {
  // 将对象中的键值对转换成 URL 查询字符串
  const queryString = Object.keys(params)
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    )
    .join("&");

  // 如果 baseUrl 已经有查询参数，则加 '&'，否则加 '?'
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${queryString}`;
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
