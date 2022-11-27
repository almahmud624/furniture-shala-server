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

    // get product data by categories name
    // app.get("/products/:category", async (req, res) => {
    //   console.log(req.params);

    //   const categoriesProduct = await productCollection
    //     .find({ categories: req.params.category })
    //     .toArray();
    //   res.send(categoriesProduct);
    // });

    // update advertisment status
    app.patch("/products/:id", async (req, res) => {
      const query = { _id: ObjectId(req.params.id) };
      const updateAdvertisement = {
        $set: {
          advertisement: req.body.advertisement,
        },
      };
      const result = await productCollection.updateOne(
        query,
        updateAdvertisement
      );
      res.send(result);
    });
  } finally {
  }
}

run().catch((error) => console.log(error));

app.listen(port, () => {
  console.log(`Furniture Shala Running on port ${port}`);
});
