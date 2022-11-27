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
    const wishListCollection = client
      .db("furniture-shala")
      .collection("wishList");
    const ordersCollection = client.db("furniture-shala").collection("orders");

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

    // update wishlist & advertisment status
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

    // store wishItem
    app.post("/products/wishlist", async (req, res) => {
      const wishList = await wishListCollection.insertOne(req.body);
      res.send(wishList);
    });

    // collect wishitem based on email
    app.get("/products/wishlist/:email", async (req, res) => {
      const wishList = await wishListCollection
        .find({ userEmail: req.params.email })
        .toArray();
      res.send(wishList);
    });

    // store user
    app.post("/user", async (req, res) => {
      const duplicateUser = await usersCollection
        .find({ email: req.body.email })
        .toArray();

      if (duplicateUser.length) {
        return;
      }
      const result = await usersCollection.insertOne(req.body);
      res.send(result);
    });
    // get user
    app.get("/user", async (req, res) => {
      const user = await usersCollection.find({}).toArray();
      res.send(user);
    });
    // set role admin
    app.patch("/user/role/:id", async (req, res) => {
      const makeAdmin = {
        $set: {
          role: req.body.role,
          previousRole: req.body.previousRole,
        },
      };
      const result = await usersCollection.updateOne(
        { _id: ObjectId(req.params.id) },
        makeAdmin
      );
      res.send(result);
    });
    // user role check
    app.get("/user/role/:email", async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      res.send(user);
    });

    // admin role check
    app.get("/user/admin/:email", async (req, res) => {
      const user = await usersCollection.findOne({ email: req.params.email });
      res.send({ isAdmin: user?.role === "admin" });
    });

    // store user order
    app.post("/orders", async (req, res) => {
      const result = await ordersCollection.insertOne(req.body);
      res.send(result);
    });
    // get user order based on user email
    app.get("/orders/:email", async (req, res) => {
      const orders = await ordersCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(orders);
    });
  } finally {
  }
}

run().catch((error) => console.log(error));

app.listen(port, () => {
  console.log(`Furniture Shala Running on port ${port}`);
});
