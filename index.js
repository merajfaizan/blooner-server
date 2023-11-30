const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
    const blogCollection = client.db("bloonerDB").collection("blogs");
    const donationRequestCollection = client
      .db("bloonerDB")
      .collection("donationRequest");

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

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // use verify admin after verifyToken
    const verifyAdminOrVolunteer = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdminOrVolunteer =
        user?.role === "admin" || user?.role === "volunteer";
      if (!isAdminOrVolunteer) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // users related routes
    // get user information via email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      const user = await userCollection.findOne(query);
      res.send({ user });
    });

    // get all user information admin , volunteer , donors
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const { options, page = 1, pageSize = 5 } = req.query;
      let query = {}; // Default: All
      const skip = (parseInt(page) - 1) * parseInt(pageSize);

      if (options === "active") {
        query = { status: "active" };
      } else if (options === "blocked") {
        query = { status: "blocked" };
      }

      const result = await userCollection
        .find(query)
        .skip(skip)
        .limit(Number(pageSize))
        .toArray();

      const totalCount = await userCollection.countDocuments(query);

      res.send({ data: result, totalCount });
    });

    // make the user block or unblock
    app.put(
      "/users/:id/toggle-status",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const userId = req.params.id;
        const user = await userCollection.findOne({
          _id: new ObjectId(userId),
        });
        const newStatus = user.status === "active" ? "blocked" : "active";

        const result = await userCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { status: newStatus } }
        );

        res.send(result);
      }
    );

    // give the user role
    app.put(
      "/users/:id/toggle-role",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const userId = req.params.id;
        const { newRole } = req.body;
        const user = await userCollection.findOne({
          _id: new ObjectId(userId),
        });

        const result = await userCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { role: newRole } }
        );

        res.send(result);
      }
    );

    // get all donors information
    app.get("/donors", async (req, res) => {
      const query = { role: "donor" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // get filterd donors information
    app.post("/find-donors", async (req, res) => {
      const query = req.body;
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // update the user info after token verify
    app.put("/users", verifyToken, async (req, res) => {
      const userData = req.body;
      const email = req.decoded.email;
      const query = { email: email };

      const result = await userCollection.updateOne(query, { $set: userData });
      console.log(result);
      res.send(result);
    });

    // create user in the database after checking is user already exists or not
    app.post("/users", async (req, res) => {
      const user = req.body;
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

    // donation related routes
    // get donation request detail of logged in user and limit upto 3 data
    app.get("/donation-requests", verifyToken, async (req, res) => {
      const userEmail = req.decoded.email;
      const { limit = 5, page = 1, status = "all" } = req.query;

      try {
        const query =
          status === "all"
            ? { requesterEmail: userEmail }
            : { requesterEmail: userEmail, status };

        // Get total count of donation requests
        const totalCount = await donationRequestCollection.countDocuments(
          query
        );

        // calculate pagination
        const skip = (page - 1) * Number(limit);

        const donationRequests = await donationRequestCollection
          .find(query)
          .skip(skip)
          .limit(Number(limit))
          .toArray();

        res.send({ totalCount, donationRequests });
      } catch (error) {
        console.error("Error fetching donation requests:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // get all donation request (admin and volunteer only)
    app.get(
      "/admin/donation-requests",
      verifyToken,
      verifyAdminOrVolunteer,
      async (req, res) => {
        const { limit = 5, page = 1, status = "all" } = req.query;

        try {
          let query = {};
          if (status !== "all") {
            query = { status };
          }

          // Get total count of donation requests
          const totalCount = await donationRequestCollection.countDocuments(
            query
          );

          // calculate pagination
          const skip = (page - 1) * Number(limit);

          const donationRequests = await donationRequestCollection
            .find(query)
            .skip(skip)
            .limit(Number(limit))
            .toArray();

          res.send({ totalCount, donationRequests });
        } catch (error) {
          console.error("Error fetching donation requests:", error);
          res.status(500).json({ message: "Internal Server Error" });
        }
      }
    );

    // save donation request
    app.post("/donationRequests", verifyToken, async (req, res) => {
      const donationRequestData = req.body;

      const result = await donationRequestCollection.insertOne(
        donationRequestData
      );
      res.send(result);
    });

    // get donation request details by id
    app.get("/donationRequests/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };

      const result = await donationRequestCollection.findOne(query);
      res.send(result);
    });

    // update donation request details by id for donar assign
    app.put("/donationRequests/:id", verifyToken, async (req, res) => {
      const updatedData = req.body;
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };

      const requestData = await donationRequestCollection.findOne(query);
      requestData.status = "inprogress";
      const newData = { ...updatedData, status: requestData.status };
      const result = await donationRequestCollection.updateOne(query, {
        $set: newData,
      });
      res.send(result);
    });

    // change donation request status  pending to done , canceled
    app.put(
      "/donation-requests/:id/update-status",
      verifyToken,
      async (req, res) => {
        const donationRequestId = req.params.id;
        const { status } = req.body;

        try {
          const result = await donationRequestCollection.updateOne(
            { _id: new ObjectId(donationRequestId) },
            { $set: { status } }
          );

          res.send(result);
        } catch (error) {
          console.error("Error updating donation request status:", error);
          res.status(500).json({ message: "Internal Server Error" });
        }
      }
    );

    // delete donation request
    app.delete(
      "/donation-requests/:id/delete",
      verifyToken,
      async (req, res) => {
        const donationRequestId = req.params.id;

        try {
          // Delete the donation request
          const result = await donationRequestCollection.deleteOne({
            _id: new ObjectId(donationRequestId),
          });

          res.send(result);
        } catch (error) {
          console.error("Error deleting donation request:", error);
          res.status(500).json({ message: "Internal Server Error" });
        }
      }
    );

    app.put("/donation-requests/:id/update", verifyToken, async (req, res) => {
      const donationRequestId = req.params.id;
      const updatedData = req.body;

      try {
        const result = await donationRequestCollection.updateOne(
          { _id: new ObjectId(donationRequestId) },
          { $set: updatedData }
        );

        res.json({ modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error("Error updating donation request:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // get all pending donation requests
    app.get("/pending-requests", async (req, res) => {
      const query = { status: "pending" };
      const result = await donationRequestCollection.find(query).toArray();
      res.send(result);
    });

    //blog related routes
    // get all blogs ( public )
    app.get("/blogs/all", async (req, res) => {
      const result = await blogCollection.find({}).toArray();
      res.send(result);
    });

    // get blog by id ( public )
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await blogCollection.findOne(query);
      res.send(result);
    });

    // get blogs by default all or via query draft or publish
    app.get("/blogs", verifyToken, verifyAdminOrVolunteer, async (req, res) => {
      let query = {};
      // Check the selected option and modify the query accordingly
      switch (req.query.option) {
        case "draft":
          query = { status: "draft" };
          break;
        case "published":
          query = { status: "published" };
          break;
        default:
          break;
      }

      const result = await blogCollection.find(query).toArray();
      res.send(result);
    });

    // add a new blog to db
    app.post(
      "/blogs",
      verifyToken,
      verifyAdminOrVolunteer,
      async (req, res) => {
        const blog = req.body;

        const result = await blogCollection.insertOne(blog);
        res.send(result);
      }
    );

    // update blog status to draft or publish
    app.put("/blogs/:blogId", verifyToken, verifyAdmin, async (req, res) => {
      const { blogId } = req.params;
      const { action } = req.body;

      if (action === "publish" || action === "draft") {
        const newStatus = action === "publish" ? "published" : "draft";

        const result = await blogCollection.updateOne(
          { _id: new ObjectId(blogId) },
          { $set: { status: newStatus } }
        );

        res.status(200).send(result);
      }
    });

    // delete blog by id
    app.delete("/blogs/:blogId", async (req, res) => {
      const { blogId } = req.params;

      const result = await blogCollection.deleteOne({
        _id: new ObjectId(blogId),
      });
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
