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

    // Get specific user habit by email Api ----------------------->
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

    // Get the specific habit details Api ----------------------->
    app.get("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await habitsCollection.findOne(query);
      res.send(result);
    });

    // ✅ Get all public habits with optional search & category filter
    app.get("/public_habits", async (req, res) => {
      try {
        const { category, search } = req.query; // get query params

        const query = {};

        if (category && category !== "All") {
          query.category = category;
        }

        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ];
        }

        const cursor = habitsCollection.find(query);
        const result = await cursor.toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching public habits:", error);
        res.status(500).send({ message: "Failed to fetch public habits" });
      }
    });

    // Add a new habit into the database Api ----------------->
    app.post("/add_habit", async (req, res) => {
      const newHabit = req.body;
      const result = await habitsCollection.insertOne(newHabit);
      res.send(result);
    });

    // Update id wise habit Api ------------------------------>
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

    // Marks complete button Api
    app.patch("/habits/complete/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { email } = req.body;
        const query = { _id: new ObjectId(id) };

        const habit = await habitsCollection.findOne(query);
        if (!habit) return res.status(404).send({ message: "Habit not found" });

        const today = new Date().toISOString().split("T")[0];

        // Check if user already completed today
        const alreadyCompleted = habit.completionHistory?.some(
          (entry) => entry.userEmail === email && entry.date === today
        );

        if (alreadyCompleted) {
          return res.send({ message: "Already marked complete today" });
        }

        // Push completion only for this user
        const updatedCompletionHistory = [
          ...(habit.completionHistory || []),
          { userEmail: email, date: today },
        ];

        // Calculate new streak for this user
        const userCompletions = updatedCompletionHistory
          .filter((entry) => entry.userEmail === email)
          .map((entry) => new Date(entry.date))
          .sort((a, b) => b - a);

        let streak = 0;
        let current = new Date();
        for (let i = 0; i < userCompletions.length; i++) {
          const diffDays = Math.floor(
            (current - userCompletions[i]) / (1000 * 60 * 60 * 24)
          );
          if (diffDays === i) streak++;
          else break;
        }

        // Update in DB
        await habitsCollection.updateOne(query, {
          $set: { completionHistory: updatedCompletionHistory },
          $max: { currentStreak: streak },
        });

        res.send({
          message: "Habit marked as complete",
          today,
          userEmail: email,
          currentStreak: streak,
        });
      } catch (error) {
        console.error("Error marking habit complete:", error);
        res.status(500).send({ message: "Failed to mark habit complete" });
      }
    });

    // Delete specific id wise habit Api --------------------->
    app.delete("/delete_habit/:id", async (req, res) => {
      const { id } = req.params;
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
