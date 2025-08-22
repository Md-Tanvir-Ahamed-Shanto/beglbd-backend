const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // Add this import
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// -----------------
// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(process.env.UPLOAD_DIR || "./uploads"));

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || "./uploads");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /pdf|jpg|jpeg|png/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are allowed"));
    }
  },
});

// -----------------
// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.shn5wut.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB Client Setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// -----------------
// Database & Collection references
let LeadCollection;
let CounselorCollection;
let HeroSectionCollection;
let StatsCollections;
let ServicesCollections;
let PertnerCollections;
let FAQCollections;
let ContactsCollections;
let AdminCollections;
// new  collection
let MetarialCollections;
let BlogsCollections;
let CategoryCollections;

// -----------------
// Run MongoDB connection
async function run() {
  try {
    await client.connect();

    const db = client.db("BGEL_BD");

    LeadCollection = db.collection("Leads");
    CounselorCollection = db.collection("Counselors");
    HeroSectionCollection = db.collection("HeroSection");
    StatsCollections = db.collection("Stats");
    ServicesCollections = db.collection("Services");
    PertnerCollections = db.collection("Pertners");
    FAQCollections = db.collection("FAQs");
    ContactsCollections = db.collection("Contacts");
    AdminCollections = db.collection("Admins");
    // new  collecitons-->
    MetarialCollections = db.collection("Metarials");
    BlogsCollections = db.collection("Blogs");
    CategoryCollections = db.collection("Category");

    console.log("✅ Successfully connected to MongoDB!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}
run();

// GET document by studentId and documentId
app.get("/api/leads/:studentId/documents/:documentId", async (req, res) => {
  try {
    const { studentId, documentId } = req.params;

    // Validate studentId
    const studentIdNum = Number(studentId);
    if (isNaN(studentIdNum)) {
      return res
        .status(400)
        .json({ error: "Invalid student ID: must be a number" });
    }

    // Find the lead in the Leads collection
    const lead = await LeadCollection.findOne({ id: studentIdNum });
    if (!lead) {
      return res
        .status(404)
        .json({ error: `Lead not found for studentId: ${studentId}` });
    }

    // Find the specific document in the lead's documents array
    const document = lead.documents.find((doc) => doc.id === documentId);
    if (!document) {
      return res
        .status(404)
        .json({ error: `Document not found for documentId: ${documentId}` });
    }

    // Construct and validate the file path
    const uploadDir = process.env.UPLOAD_DIR || "./Uploads";
    const filePath = path.join(uploadDir, document.name);
    console.log(`Attempting to serve file: ${filePath}`); // Debug log

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ error: `File not found on server: ${document.name}` });
    }

    // Check file accessibility
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (error) {
      console.error(`File access error for ${filePath}:`, error);
      return res
        .status(500)
        .json({ error: `Unable to access file: ${document.name}` });
    }

    // Set appropriate headers for file viewing
    const contentType = getContentType(document.name);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${document.name}"`);

    // Stream the file to the client
    const fileStream = fs.createReadStream(filePath);
    fileStream.on("error", (error) => {
      console.error(`File stream error for ${filePath}:`, error);
      res
        .status(500)
        .json({ error: `Failed to stream file: ${document.name}` });
    });
    fileStream.pipe(res);
  } catch (error) {
    console.error(
      `Error serving document (studentId: ${req.params.studentId}, documentId: ${req.params.documentId}):`,
      error
    );
    res
      .status(500)
      .json({ error: `Failed to serve document: ${error.message}` });
  }
});

// Helper function to determine content type
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

// ... (rest of your existing server code remains unchanged)

// main api section starts here --->
//! add a new lead data  post api---->
app.post("/add_new_lead", async (req, res) => {
  const data = req.body;
  const result = await LeadCollection.insertOne(data);
  res.send(result);
});
//! get all leads data get api--->
app.get("/get_all_lead_data", async (req, res) => {
  const result = await LeadCollection.find().sort({ _id: -1 }).toArray();
  res.send(result);
});
//! update status api---->
app.patch("/api/leads/:id", async (req, res) => {
  const { id } = req.params;
  const { status, adminEmail } = req.body;

  const query = { id: Number(id) };
  const updateDoc = {
    $set: {
      status,
      counselor: "Admin",
      counselorName: adminEmail,
    },
  };

  const result = await LeadCollection.updateOne(query, updateDoc);
  res.send(result);
});

// ! add new counselor post api---->
app.post("/add_new_counselor", async (req, res) => {
  const data = req.body;
  const result = await CounselorCollection.insertOne(data);
  res.send(result);
});
// ! get all counselor data get api---->
app.get("/all_counselor_data", async (req, res) => {
  const result = await CounselorCollection.find().sort({ _id: -1 }).toArray();
  res.send(result);
});
// !update counselor---->
// PATCH /api/counselors/:id
app.patch("/api/counselors/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updatedData = req.body;
  console.log(updatedData, "id--->", id);
  const query = { id: id };
  const upadateDoc = {
    $set: { ...updatedData },
  };
  const result = await CounselorCollection.updateOne(query, upadateDoc);
  res.send(result);
});
// DELETE /api/counselors/:id
app.delete("/api/counselors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id); // numeric id
    const query = { id: id };
    const result = await CounselorCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Counselor not found" });
    }

    res.json({
      message: "Counselor deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting counselor:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// add new hero section data--->
app.get("/hero_section_data", async (req, res) => {
  const result = await HeroSectionCollection.find().sort({ _id: -1 }).toArray();
  res.send(result);
});
// !update lead by counselor---->
app.patch("/update_leads_by_counselor/:leadId", async (req, res) => {
  const id = Number(req.params.leadId);
  const { updatedData } = req.body;
  const query = { id: id };
  const counselor = updatedData.counselorName;
  const updatedDoc = {
    $set: { ...updatedData, counselor: counselor },
  };
  const result = await LeadCollection.updateOne(query, updatedDoc);
  res.send(result);
});
// !post hero data--->
app.post("/update_hero_section_data", async (req, res) => {
  const data = req.body;
  const newData = {
    description: data.description,
    title: data.title,
    subtitle: data.subtitle,
    secondaryButton: data.secondaryButton,
    primaryButton: data.primaryButton,
  };
  const result = await HeroSectionCollection.insertOne(newData);
  res.send(result);
});
// ! statistics cololections--->
app.post("/add_stats", async (req, res) => {
  const data = req.body;
  const newData = {
    successfullyDeparted: data.successfullyDeparted,
    filesOpened: data.filesOpened,
    interestedStudents: data.interestedStudents,
  };
  const result = await StatsCollections.insertOne(newData);
  res.send(result);
});
app.get("/stats_collection", async (req, res) => {
  const result = await StatsCollections.find().sort({ _id: -1 }).toArray();
  res.send(result);
});
// ! our servives----->
app.get("/our_services", async (req, res) => {
  const result = await ServicesCollections.find().sort({ _id: -1 }).toArray();
  res.send(result);
});
app.post("/post_new_service", async (req, res) => {
  const data = req.body;
  const result = await ServicesCollections.insertOne(data);
  res.send(result);
});
app.patch("/update_service_data/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const query = { _id: new ObjectId(id) };
  const updateDoc = { $set: { ...data } };
  const result = await ServicesCollections.updateOne(query, updateDoc);
  res.send(result);
});
app.delete("/delete_service_data/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await ServicesCollections.deleteOne(query);
  res.send(result);
});
//! university partner--->
app.get("/all_university_partners", async (req, res) => {
  const result = await PertnerCollections.find().sort({ _id: -1 }).toArray();
  res.send(result);
});
app.post("/add_new_university", async (req, res) => {
  const data = req.body;
  const result = await PertnerCollections.insertOne(data);
  res.send(result);
});
app.patch("/update_university/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const query = { _id: new ObjectId(id) };
  const updateDoc = { $set: { ...data } };
  const result = await PertnerCollections.updateOne(query, updateDoc);
  res.send(result);
});
app.delete("/delete_university_data/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await PertnerCollections.deleteOne(query);
  res.send(result);
});
// Faq CRUD Operations--->
app.get("/all_faqs", async (req, res) => {
  const result = await FAQCollections.find().sort({ _id: -1 }).toArray();
  res.send(result);
});
app.post("/add_new_faq", async (req, res) => {
  const data = req.body;
  const result = await FAQCollections.insertOne(data);
  res.send(result);
});
app.patch("/update_faq/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const query = { _id: new ObjectId(id) };
  const updateDoc = { $set: { ...data } };
  const result = await FAQCollections.updateOne(query, updateDoc);
  res.send(result);
});
app.delete("/delete_faq_data/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await FAQCollections.deleteOne(query);
  res.send(result);
});
// !contact informations--->
app.get("/contact_informations", async (req, res) => {
  const result = await ContactsCollections.find().sort({ _id: -1 }).toArray();
  const finalResult = result[0];
  res.send(finalResult);
});
app.post("/add_contact_informations", async (req, res) => {
  const data = req.body;
  const newData = {
    address: data.address,
    email1: data.email1,
    email2: data.email2,
    officeHours: data.officeHours,
    phone1: data.phone1,
    phone2: data.phone2,
    whatsapp: data.whatsapp,
  };
  const result = await ContactsCollections.insertOne(newData);
  res.send(result);
});
// !account update counselor profile dit api---->
app.patch("/update_account_counselor_information/:id", async (req, res) => {
  const id = req.params;
  const data = req.body;
  const query = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: { ...data },
  };
  const result = await CounselorCollection.updateOne(query, updatedDoc);
  res.send(result);
});
// ! New Endpoints for StudentDocumentUpload --->
// GET lead by linkId
app.get("/api/leads/link/:linkId", async (req, res) => {
  try {
    const { linkId } = req.params;
    let lead;
    if (linkId) {
      lead = await LeadCollection.findOne({ id: Number(linkId) });
    }
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    // Map _id to id for frontend compatibility
    res.send({ ...lead, id: lead?.id || lead?._id?.toString() });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});
// POST verify phone number
app.post("/api/leads/verify-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }
    const lead = await LeadCollection.findOne({
      phone: phone.replace(/\s/g, ""),
    });
    if (!lead) {
      return res.status(404).json({ error: "Phone number not registered" });
    }
    // Map _id to id for frontend compatibility
    res.send({ ...lead, id: lead?.id || lead?._id.toString() });
  } catch (error) {
    res.status(500).json({ error: "Failed to verify phone number" });
  }
});
// POST upload documents and update lead
app.post(
  "/api/leads/:linkId/documents",
  upload.array("documents"),
  async (req, res) => {
    try {
      const { linkId } = req.params;
      const { counselorUsername } = req.body; // Expect counselorUsername from frontend
      if (!counselorUsername) {
        return res
          .status(400)
          .json({ error: "Counselor username is required" });
      }

      const lead = await LeadCollection.findOne({ id: Number(linkId) });
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const counselor = await CounselorCollection.findOne({
        username: counselorUsername,
      });
      if (!counselor) {
        return res.status(404).json({ error: "Counselor not found" });
      }

      const files = req.files;
      const requiredDocs = ["transcript", "ielts", "passport"];
      const uploadedDocs = files.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.filename,
        size: file.size,
        type: req.body[`documentType_${file.originalname}`] || file.fieldname, // Use document type from form-data
      }));

      // Validate required documents
      const uploadedTypes = uploadedDocs.map((doc) => doc.type);
      const missingDocs = requiredDocs.filter(
        (doc) => !uploadedTypes.includes(doc)
      );
      if (missingDocs.length > 0) {
        return res.status(400).json({
          error: `Missing required documents: ${missingDocs.join(", ")}`,
        });
      }

      // Update lead
      const updateData = {
        documents: uploadedDocs,
        counselorId: counselor?._id?.toString(),
        counselorName: counselor?.name,
        status: "File Open",
        lastContact: new Date().toISOString().split("T")[0],
      };

      const result = await LeadCollection.findOneAndUpdate(
        { id: Number(linkId) },
        { $set: updateData },
        { returnDocument: "after" }
      );

      res.send({
        ...result.value,
        id: result.value?.id || result.value?._id.toString(),
      });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ error: error.message || "Failed to upload documents" });
    }
  }
);

// GET current counselor
app.get("/api/counselors/me", async (req, res) => {
  try {
    const { counselorUsername } = req.query; // Expect counselorUsername as query param
    if (!counselorUsername) {
      return res.status(400).json({ error: "Counselor username is required" });
    }
    const counselor = await CounselorCollection.findOne({
      username: counselorUsername,
    });
    if (!counselor) {
      return res.status(404).json({ error: "Counselor not found" });
    }
    res.send({
      id: counselor._id.toString(),
      name: counselor.name,
      username: counselor.username,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch counselor" });
  }
});
// ! admin related api --->
app.get("/admin_data", async (req, res) => {
  const result = await AdminCollections.find().toArray();
  res.send(result);
});
app.post("/admin_data", async (req, res) => {
  const data = req.body;
  console.log(data);
  const result = await AdminCollections.insertOne(data);
  res.send(result);
});
app.patch("/admin_data/:id", async (req, res) => {
  try {
    // Extract the id from req.params
    const { id } = req.params; // Correctly destructure id from req.params
    const data = req.body; // Get the data from the request body

    // Create the MongoDB query using ObjectId
    const query = { _id: new ObjectId(id) };
    // Prepare the update document
    const updatedDoc = {
      $set: { ...data },
    };

    // Perform the update operation
    const result = await AdminCollections.updateOne(query, updatedDoc);

    // Send the result back to the client
    res.status(200).send(result);
  } catch (error) {
    // Handle any errors
    console.error("Error updating admin data:", error);
    res.status(500).send({ error: "Failed to update settings" });
  }
});
// counselor edit api------>
// Update counselor data route
app.patch("/update_counselor_data/:id", async (req, res) => {
  try {
    const id = req.params.id; // ✅ id properly nibo
    const data = req.body; // ✅ incoming profile info or password or image

    const query = { _id: new ObjectId(id) };

    const updatedDoc = {
      $set: {
        ...data, // ✅ jekono field (name, email, phone, profileImage, password etc.)
      },
    };

    const result = await CounselorCollection.updateOne(query, updatedDoc);

    res.send(result);
  } catch (error) {
    console.error("Error updating counselor:", error);
    res.status(500).send({ message: "Failed to update counselor" });
  }
});

// !new api for upload document--->
app.patch("/add_new_document/:phoneNumberLead", async (req, res) => {
  try {
    const { phoneNumberLead } = req.params; // matches the URL param
    const documents = req.body; // your documents array

    const query = { phone: phoneNumberLead };
    const update = { $set: { documents: documents } };

    const result = await LeadCollection.updateOne(query, update, {
      upsert: true,
    });
    // upsert: true creates new doc if phone not found

    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Server error" });
  }
});
//! metarial managements  api----->
app.get("/all_metarial_data", async (req, res) => {
  const result = await MetarialCollections.find().sort({ _id: -1 }).toArray();
  res.send(result);
});
app.post("/post_a_new_metarila", async (req, res) => {
  const data = req.body;
  const result = await MetarialCollections.insertOne(data);
  res.send(result);
});
app.patch("/update_metarila_data/:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const query = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: { ...data },
  };
  const result = await MetarialCollections.updateOne(query, updatedDoc);
  res.send(result);
});
app.patch("/delete_metarila_data/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await MetarialCollections.deleteOne(query);
  res.send(result);
});

app.patch("/increment_download/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };

    const updatedDoc = {
      $inc: { downloads: 1 },
    };

    const result = await MetarialCollections.updateOne(query, updatedDoc);

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: "Download count updated" });
    } else {
      res.status(404).send({ success: false, message: "Material not found" });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ success: false, message: "Failed to update download count" });
  }
});

//! category management api---->
app.get("/all_category_data", async (req, res) => {
  const result = await CategoryCollections.find().sort({ _id: -1 }).toArray();
  res.send(result);
});
app.post("/post_a_new_category", async (req, res) => {
  const data = req.body;
  const result = await CategoryCollections.insertOne(data);
  res.send(result);
});
app.patch("/delete_category_data/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await CategoryCollections.deleteOne(query);
  res.send(result);
});
//! blogs managements  api----->
app.get("/all_blogs_data", async (req, res) => {
  const result = await BlogsCollections.find().sort({ _id: -1 }).toArray();
  res.send(result);
});
app.get("/blog/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await BlogsCollections.findOne(query);
  res.send(result);
});
app.post("/post_a_new_blog", async (req, res) => {
  const data = req.body;
  const publishDate = new Date().toDateString();
  const finalData = { ...data, publishDate };
  const result = await BlogsCollections.insertOne(finalData);
  res.send(result);
});
app.patch("/update_blog_data/:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const query = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: { ...data },
  };
  const result = await BlogsCollections.updateOne(query, updatedDoc);
  res.send(result);
});
app.patch("/delete_blog_data/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await BlogsCollections.deleteOne(query);
  res.send(result);
});
// increament views---->
app.patch("/add_views/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: new ObjectId(id) };

    const updatedDoc = {
      $inc: { views: 1 }, // views না থাকলেও MongoDB নিজে 0 থেকে ধরবে
    };

    const result = await BlogsCollections.updateOne(query, updatedDoc, {
      upsert: true,
    });

    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      res.send({ success: true, message: "View count updated" });
    } else {
      res.status(404).send({ success: false, message: "Blog not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Failed to update views" });
  }
});

// main api section ends here --->
// -----------------
// Sample route
app.get("/", (req, res) => {
  res.send("✅ The bd server is running");
});

// -----------------
// Start server
app.listen(port, () => {
  console.log(`🚀the bd Server is running on port ${port}`);
});
