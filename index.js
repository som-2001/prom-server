const express = require('express');
const client= require('prom-client')
const cors = require('cors');
const app = express();
const responseTime=require('response-time');

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const collectDefaultMetrics=client.collectDefaultMetrics;

collectDefaultMetrics({register:client.register});

const reqResTime=new client.Histogram({
    name:"http_express_req_res_time",
    help:"This tells how much time is taken by req and res",
    labelNames:['method','route','status_code'],
    buckets:[1,50,100,200,400,500,800,1000,2000,3000,4000,5000,6000,7000],
});

const totalReq=new client.Counter({
    name:"total_request",
    help:"this tells total request",
    labelNames:['method','route','status_code']
})

const activeConnections = new client.Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
});

app.use((req, res, next) => {
    activeConnections.inc();
    res.on('finish', () => {
        activeConnections.dec();
    });
    next();
});

const errorCounter = new client.Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors',
    labelNames: ['method', 'route', 'status_code'],
});

app.use(responseTime((req,res,time)=>{

    totalReq.labels({
        method: req.method,
        route:req.url,
        status_code:req.statusCode
    }).inc();

    reqResTime.labels({
        method: req.method,
        route:req.url,
        status_code:req.statusCode
    }).observe(time)

    if (res.statusCode >= 400) {
        errorCounter.labels(req.method, req.url, res.statusCode).inc();
    }
}))

app.get('/metrics',async(req,res)=>{
    res.setHeader('Content-Type',client.register.contentType);

    const metrics=await client.register.metrics();
    res.send(metrics);
    
})

app.get('/api/check', (req, res) => {
    res.send('hellloo guys its working!!!!!!');
});

app.get('/api/slow', (req, res) => {
    // Simulate a delay of 10 seconds (10000 milliseconds)
    setTimeout(() => {
        res.send('Hello, this response was intentionally delayed!');
    }, 5000);
});

app.get('/api/slower', (req, res) => {
    // Simulate a delay of 10 seconds (10000 milliseconds)
    setTimeout(() => {
        res.send('Hello, this response was intentionally delayed!');
    }, 7000);
});
app.listen(3001, () => {
    console.log(`server is listening at 3001`);
});
