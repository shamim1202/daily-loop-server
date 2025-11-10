const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;
const app = express();

// Middleware ----------------------------------------------->
app.use(cors());
app.use(express.json());

// Mongodb Connection Link ----------------------------------->
const uri =
  "mongodb+srv://dailyLoopDB:vli3zfPFj5IVsa0m@cluster0.qx9mzcm.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello, Back-End Dev...");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("habitDB");
    const habitsCollection = db.collection("habits");

    // Get latest 6 habits in descending order with limit-6 in Featured Habit
    app.get("/featured_habits", async (req, res) => {
      const projectFields = {
        title: 1,
        description: 1,
        imageUrl: 1,
        userName: 1,
      };
      const cursor = habitsCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .project(projectFields);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get specific user habit by email ----------------------------->
    app.get("/my_habits", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.userEmail = email;
      }
      const cursor = habitsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await habitsCollection.findOne(query);
      res.send(result);
    });

    // Add a new habit into the database ---------------------->
    app.post("/add_habit", async (req, res) => {
      const newHabit = req.body;
      const result = await habitsCollection.insertOne(newHabit);
      res.send(result);
    });

    app.patch("/update_habit/:id", async (req, res) => {
      const id = req.params;
      const updateHabit = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updateHabit,
      };
      const result = await habitsCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete("/delete_habit/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await habitsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Server is running on port", port);
});
