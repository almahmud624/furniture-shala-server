const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json());
require("dotenv").config();
const jwt = require("jsonwebtoken");

app.get("/", (req, res) => {
  res.send("Furniture Shala Running");
});

// stripe key
const stripe = require("stripe")(process.env.STRIPE_SK);

// create jwt token
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });
  res.send({ token });
});

// jwt verify function
const verifyJWT = (req, res, next) => {
  const jwtHeaders = req.headers.authorization;
  if (!jwtHeaders) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  const token = jwtHeaders.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send("Forbidden Access");
    }
    req.decoded = decoded;
    next();
  });
};

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
    const paymentCollection = client
      .db("furniture-shala")
      .collection("payments");
    const reportdItemCollection = client
      .db("furniture-shala")
      .collection("reportedItems");

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
    app.patch("/products/:id", verifyJWT, async (req, res) => {
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

    //get seller
    app.get("/user/seller", async (req, res) => {
      const seller = await usersCollection.find({ role: "seller" }).toArray();

      res.send(seller);
    });

    // delete seller
    app.delete("/user/seller/:id", async (req, res) => {
      const result = await usersCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });

    // verify seller
    app.patch("/user/seller/:email", verifyJWT, async (req, res) => {
      console.log(req.params.email);

      const updateSeller = {
        $set: {
          verfiedSeller: true,
        },
      };
      const result = await usersCollection.updateOne(
        { email: req.params.email },
        updateSeller
      );
      const updateVerfiySeller = {
        $set: {
          sellerVerify: true,
        },
      };
      const verfieidSeller = await productCollection.updateMany(
        { sellerEmail: req.params.email },
        updateVerfiySeller
      );
      res.send(result);
    });

    // get all buyers
    app.get("/user/buyers", async (req, res) => {
      const buyers = await usersCollection.find({ role: "user" }).toArray();
      res.send(buyers);
    });
    // delete buyers
    app.delete("/user/buyers/:id", async (req, res) => {
      const result = await usersCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });
    // store user order
    app.post("/orders", async (req, res) => {
      const result = await ordersCollection.insertOne(req.body);
      res.send(result);
    });
    // get all order
    app.get("/orders", async (req, res) => {
      const orders = await ordersCollection.find({}).toArray();
      const mostSelledProducts = await productCollection
        .find({})
        .sort({ totalSelled: -1 })
        .limit(5)
        .toArray();
      async function countDuplicates(array, property) {
        const countObj = {};

        // Count the occurrences of each value in the specified property
        for (let i = 0; i < array.length; i++) {
          const element = array?.[i][property];
          countObj[element] = (countObj[element] || 0) + 1;
        }

        // Print the counts of duplicate values
        for (let element in countObj) {
          if (countObj[element] > 1) {
            const totalSelled = {
              $set: { totalSelled: countObj[element] },
            };
            await productCollection.updateOne(
              { _id: ObjectId(element) },
              totalSelled,
              true,
              function (err, result) {
                if (err) {
                  console.error("Failed to update document:", err);
                  return;
                }
              }
            );
          }
        }
      }
      countDuplicates(orders, "productId");
      res.send(mostSelledProducts);
    });
    // get user order based on user email
    app.get("/orders/:email", verifyJWT, async (req, res) => {
      const orders = await ordersCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(orders);
    });
    //get single product
    app.get("/orders/payment/:id", async (req, res) => {
      const orders = await ordersCollection.findOne({
        _id: ObjectId(req.params.id),
      });

      res.send(orders);
    });

    // stripe payment intention
    app.post("/create-payment-intent", async (req, res) => {
      const price = req.body.price;
      const amount = price * 100; // convert price into decimal / paisa পয়সা

      const paymentIntents = await stripe.paymentIntents.create({
        currency: "usd",
        amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntents.client_secret,
      });

      // store payment data
      app.post("/payments", async (req, res) => {
        const result = await paymentCollection.insertOne(req.body);
        const orderFilter = { _id: ObjectId(req.body.orderId) };
        const updateDoc = {
          $set: {
            paid: true,
          },
        };
        const updatedOrder = await ordersCollection.updateOne(
          orderFilter,
          updateDoc,
          true
        );
        const stockUpdate = {
          $set: {
            inStock: "sold",
            advertisement: false,
          },
        };
        const updateProduct = await productCollection.updateOne(
          { _id: ObjectId(req.body.productId) },
          stockUpdate,
          true
        );
        res.send(result);
      });
    });
  } finally {
  }
}

run().catch((error) => console.log(error));

app.listen(port, () => {
  console.log(`Furniture Shala Running on port ${port}`);
});
