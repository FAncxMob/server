const express = require("express");
const session = require("express-session");
const cors = require("cors");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

const app = express();
const PORT = process.env.PORT || 5000;
const PASSWORD = "fanchongxin";

// 中间件
app.use(
  cors({
    origin: "http://localhost:3000", // 前端地址
    credentials: true, // 允许发送 cookies
  })
);
app.use(express.json()); // 解析 JSON 数据

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: `mongodb+srv://fancx29:${PASSWORD}@cluster0.shxhe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`,
    }),
    cookie: { secure: false }, // 在生产环境中应设置为 true，需使用 HTTPS
  })
);
// mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
// mongodb+srv://fancx29:${PASSWORD}@cluster0.shxhe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
// MongoDB 连接
mongoose
  .connect(
    `mongodb+srv://fancx29:${PASSWORD}@cluster0.shxhe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// // 数据模型
// const DataSchema = new mongoose.Schema({
//   userId: String,
//   password: String,
//   lvl: String,
// });
// const User = mongoose.model("User", DataSchema);

// login
app.post("/api/login", async (req, res) => {
  const { userId, password } = req.body;
  const user = await mongoose.connection
    .collection("users")
    .findOne({ userId });

  if (!user) {
    return res.json({ message: "用户不存在" });
  }
  const user2 = await mongoose.connection
    .collection("users")
    .findOne({ userId, password });

  if (user2) {
    console.log("Queried user:", user2);

    req.session.user = user2; // 将用户信息存入 session
    return res.json({ message: "登录成功", user });
  } else {
    return res.json({ message: "密码错误" });
  }
});

// 受保护的路由
app.get("/api/dashboard", (req, res) => {
  console.log(req.session.user, "req.session.user");
  if (req.session.user) {
    return res.json({
      message: `欢迎回来, ${req.session.user.userId}`,
      userId: req.session.user.userId,
    });
  }

  res.json({ message: "未登录" });
});

// // 数据模型
// const DataSchema = new mongoose.Schema({
//   toUserId: String,
//   fromUserId: String,
//   message: String,
// });
// const Message = mongoose.model("message", DataSchema);

// 查询给登录用户的message
app.post("/api/fetchMyMessage", async (req, res) => {
  const { toUserId } = req.body;
  const data = await mongoose.connection
    .collection("messages")
    .find({ toUserId })
    .toArray();
  res.json(data);
});

// 登录message
app.post("/api/addMessage", async (req, res) => {
  const { toUserId, fromUserId, message } = req.body;
  const data = await mongoose.connection.collection("messages").insertOne({
    toUserId,
    fromUserId,
    message,
    updateDatetime: getCurrentTimeString(),
  });

  res.json({ message: "数据保存成功", data });
});

// 添加user
app.post("/api/addUser", async (req, res) => {
  const { userId, password, lvl } = req.body;
  const result = await mongoose.connection
    .collection("users")
    .insertOne({ userId, password, lvl: 0 });

  res.json({ message: "数据保存成功", insertedId: result.insertedId });
});

// 查看user
app.get("/api/getUserList", async (req, res) => {
  // 直接使用 MongoDB 的原生方法查询数据
  const data = await mongoose.connection.collection("users").find().toArray();
  const result = data.map((item) => ({
    value: item.userId,
    label: item.nickName,
  }));
  res.json(result);
});

// 查看user
app.get("/api/getUsers", async (req, res) => {
  // 直接使用 MongoDB 的原生方法查询数据
  const data = await mongoose.connection.collection("users").find().toArray();
  res.json(data);
});

// 存储数据 API
app.post("/api/data", async (req, res) => {
  const { key, value } = req.body;

  // 直接使用 MongoDB 的原生方法插入数据
  const result = await mongoose.connection
    .collection("datas")
    .insertOne({ key, value });

  res.json({ message: "数据保存成功", insertedId: result.insertedId });
});

// 获取数据 API
app.get("/api/data", async (req, res) => {
  // 直接使用 MongoDB 的原生方法查询数据
  const data = await mongoose.connection.collection("datas").find().toArray();
  res.json(data);
});

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

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
