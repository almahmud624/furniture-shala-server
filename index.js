const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

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
    // get product data from server
    app.get("/products/:email", async (req, res) => {
      const products = await productCollection
        .find({ sellerEmail: req.params.email })
        .toArray();
      res.send(products);
    });
  } finally {
  }
}

run().catch((error) => console.log(error));

app.listen(port, () => {
  console.log(`Furniture Shala Running on port ${port}`);
});
