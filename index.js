const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5004;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tqyfr7x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB client setup
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // MongoDB Collections
        const userCollection = client.db('MealDB2025').collection('users');
        const mealCollection = client.db('MealDB2025').collection('meals');
        const bazarCollection = client.db('MealDB2025').collection('bazar');
        const routineCollection = client.db('MealDB2025').collection('routine');
        const amountCollection = client.db('MealDB2025').collection('amount');
        const varaCollection = client.db('MealDB2025').collection('vasaBara');

        // JWT related API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1y' });
            res.send({ token });
        });

        // Middleware to verify JWT token
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized access' });
                }
                req.decoded = decoded;
                next();
            });
        };

        // Verify admin role
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden access' });
            }
            next();
        };

        // Check if user is admin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        });

        // Users related API
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });
        // Users related API
        app.get('/users2', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // Meal Insert API with Duplicate Check
        app.post('/meals', async (req, res) => {
            try {
                const { meals, date } = req.body;
                const { day, month, year } = date;

                // Check if meal already exists
                const existingMeal = await mealCollection.findOne({ "date.day": day, "date.month": month, "date.year": year });

                if (existingMeal) {
                    return res.status(400).json({ success: false, message: "This date meal is already inserted!" });
                }

                // Insert new meal
                const newMeal = {
                    meals,
                    date,
                };

                const result = await mealCollection.insertOne(newMeal);
                res.json({ success: true, message: "Meal data submitted successfully!", insertedId: result.insertedId });

            } catch (error) {
                console.error(error);
                res.status(500).json({ success: false, message: "Server Error" });
            }
        });

        // Get Meals API
        app.get('/meals', async (req, res) => {
            const result = await mealCollection.find().toArray();
            res.send(result);
        });

        app.delete('/meals/:id', async (req, res) => {
            const mealId = req.params.id;

            try {
                const result = await mealCollection.deleteOne({ _id: new ObjectId(mealId) });

                if (result.deletedCount === 1) {
                    res.status(200).send({ message: 'Meal deleted successfully.' });
                } else {
                    res.status(404).send({ message: 'Meal not found.' });
                }
            } catch (error) {
                console.error('Error deleting meal:', error);
                res.status(500).send({ message: 'Server error while deleting the meal.' });
            }
        });


        app.post('/bazar', async (req, res) => {
            const jobInfo = req.body;
            try {
                const result = await bazarCollection.insertOne(jobInfo);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to create job event" });
            }
        });

        // Get Bazar data by user email
        app.get('/bazar/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            try {
                const bazars = await bazarCollection.find(query).toArray();
                res.send(bazars);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch bazar data" });
            }
        });

        app.get('/bazar', async (req, res) => {
            const result = await bazarCollection.find().toArray();
            res.send(result);
        });


        app.delete('/bazar/:id', async (req, res) => {
            const { id } = req.params;

            try {
                const result = await bazarCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Bazar not found' });
                }

                res.send({ message: 'Bazar deleted successfully' });
            } catch (error) {
                console.error("Error deleting job event:", error);
                res.status(500).send({ message: 'Failed to delete job event' });
            }
        });

        app.delete('/users/:id', async (req, res) => {
            const { id } = req.params;

            try {
                const result = await userCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Bazar not found' });
                }

                res.send({ message: 'Bazar deleted successfully' });
            } catch (error) {
                console.error("Error deleting job event:", error);
                res.status(500).send({ message: 'Failed to delete job event' });
            }
        });

        app.post('/routine', async (req, res) => {
            const jobInfo = req.body;
            try {
                // Check if the user already has a routine
                const existingRoutine = await routineCollection.findOne({ username: jobInfo.username });

                if (existingRoutine) {
                    // If routine exists, return a message
                    return res.status(400).send({ message: "User routine is already created" });
                }

                // Insert new routine if not already created
                const result = await routineCollection.insertOne(jobInfo);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to create job event" });
            }
        });

        // 🔹 Get All Routines (Admin View)
        app.get("/routine", async (_, res) => {
            try {
                const routines = await routineCollection.find().toArray();
                res.status(200).json(routines);
            } catch (error) {
                console.error("Error fetching routines:", error);
                res.status(500).json({ message: "Internal Server Error" });
            }
        });

        app.delete('/routine/:id', async (req, res) => {
            const { id } = req.params;

            try {
                // Ensure ObjectId is used properly in query
                const result = await routineCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Bazar not found' });
                }

                // Send success message on successful deletion
                res.send({ message: 'Bazar deleted successfully' });
            } catch (error) {
                console.error("Error deleting job event:", error);
                res.status(500).send({ message: 'Failed to delete job event' });
            }
        });

        app.post('/amount', async (req, res) => {
            const jobInfo = req.body;
            try {
                const result = await amountCollection.insertOne(jobInfo);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to create job event" });
            }
        });

        app.get('/amount', async (req, res) => {
            const result = await amountCollection.find().toArray();
            res.send(result);
        });

        app.delete('/amount/:id', async (req, res) => {
            const { id } = req.params;

            try {
                // Ensure ObjectId is used properly in query
                const result = await amountCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Bazar not found' });
                }

                // Send success message on successful deletion
                res.send({ message: 'Bazar deleted successfully' });
            } catch (error) {
                console.error("Error deleting job event:", error);
                res.status(500).send({ message: 'Failed to delete job event' });
            }
        });

        // POST route to add room rent info
        app.post('/basaBara', async (req, res) => {
            const jobInfo = req.body;
            try {
                const exists = await varaCollection.findOne({
                    userId: jobInfo.userId,
                });

                if (exists) {
                    return res.status(400).send({ alreadyExists: true, message: "Already submitted for this month" });
                }

                const result = await varaCollection.insertOne(jobInfo);
                res.send(result);
            } catch (error) {
                console.error('Error inserting:', error);
                res.status(500).send({ message: "Failed to create job event" });
            }
        });


        app.get("/basaBara", async (req, res) => {
            try {
                const result = await varaCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch rent data" });
            }
        });

        app.delete('/basaBara/:id', async (req, res) => {
            const { id } = req.params;

            try {
                // Ensure ObjectId is used properly in query
                const result = await varaCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ message: 'Bazar not found' });
                }

                // Send success message on successful deletion
                res.send({ message: 'Bazar deleted successfully' });
            } catch (error) {
                console.error("Error deleting job event:", error);
                res.status(500).send({ message: 'Failed to delete job event' });
            }
        });

         app.get("/rentAmount", async (req, res) => {
            try {
                const result = await varaCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch rent data" });
            }
        });

        // console.log('Connected to MongoDB!');
    } finally {
        // Uncomment if you want to close the client connection after operation
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('MealDB is running');
});

app.listen(port, () => {
    console.log(`MealDB is running on port ${port}`);
});
