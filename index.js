const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

// connect to database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k5v5ibx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// api routes
async function run() {
  try {
    // await client.connect();
    const userCollection = client.db("bloonerDB").collection("users");

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    

    // users related routes
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      const user = await userCollection.findOne(query);
      res.send({user});
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email if user doesn't exists for making email unique
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({
          message: "user already exists with this email, try different email",
          insertedId: null,
        });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // await client.close(console.log("database is closed"));
  }
}
run().catch((err) => console.log(err));

// initial api routes and listen.
app.get("/", (req, res) => {
  res.send("Blooner server is online");
});

app.listen(port, () => {
  console.log(`blooner server listening on port ${port}`);
});
