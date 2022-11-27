const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json());
require("dotenv").config();

app.get("/", (req, res) => {
  res.send("Furniture Shala Running");
});

const uri = process.env.DB_URL;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const productCollection = client
      .db("furniture-shala")
      .collection("products");
    const usersCollection = client.db("furniture-shala").collection("users");

    // send products data on server
    app.post("/products", async (req, res) => {
      const result = await productCollection.insertOne(req.body);
      res.send(result);
    });

    // get all product by initial or by category query from server
    app.get("/products", async (req, res) => {
      let query = {};
      const category = req.query.category;
      if (category) {
        query = {
          categories: category,
        };
      }
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });

    // get product data from server by seller email
    app.get("/products/:email", async (req, res) => {
      const products = await productCollection
        .find({ sellerEmail: req.params.email })
        .toArray();
      res.send(products);
    });

    // update advertisment status
    app.patch("/products/:id", async (req, res) => {
      const query = { _id: ObjectId(req.params.id) };
      const updateSet = req.body.updateSet;

      let updateAbleItems;
      if (updateSet === "advertisement") {
        updateAbleItems = {
          $set: {
            advertisement: req.body.advertisement,
          },
        };
      } else if (updateSet === "wishListed") {
        updateAbleItems = {
          $set: {
            wishListed: req.body.wishListed,
          },
        };
      }
      const result = await productCollection.updateOne(query, updateAbleItems);
      res.send(result);
    });

    // store user
    app.post("/user", async (req, res) => {
      const result = await usersCollection.insertOne(req.body);
      res.send(result);
    });
    // get user
    app.get("/user", async (req, res) => {
      const user = await usersCollection.find({}).toArray();
      res.send(user);
    });
  } finally {
  }
}

run().catch((error) => console.log(error));

app.listen(port, () => {
  console.log(`Furniture Shala Running on port ${port}`);
});
