var express = require('express');
var moment = require('moment');
var clone = require('clone');
var fs = require('fs');
var router = express.Router();
var JiraClient = require('jira-connector');
var SearchClient = require('jira-connector');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var jira = new JiraClient({
    host: config.host,
    protocol: config.protocol,
    basic_auth: {
        base64: config.base64
    }
});
router.post('/', function (req, res) {
    var jqlrequest = 'project = NOC AND issuetype = "Availability event" AND Product = ' + req.body.prod + ' AND ("Start time" >= "' + req.body.startDate + ' 06:00" OR "End time" >= "' + req.body.startDate + ' 06:00") AND ("Start time" <= "' + req.body.endDate + ' 06:00" OR "End time" <= "' + req.body.endDate + ' 06:00") ORDER BY cf[12319] ASC';
    var period = moment(req.body.endDate, 'YYYY-MM-DD').diff(moment(req.body.startDate,  'YYYY-MM-DD'), 'minutes');
    startPeriod = moment(req.body.startDate + ' 06:00 AM', 'YYYY-MM-DD h:mm A');   
    endPeriod = moment(req.body.endDate + ' 06:00 AM', 'YYYY-MM-DD h:mm A');
    new SearchClient(jira).search.search({
        jql: jqlrequest
    },
    function (error, issue) {
        if ((issue != null) && (!startPeriod.isAfter(endPeriod))) {
            var checkfieldsArray = ['summary', 'customfield_12326', 'customfield_12319', 'customfield_12320', 'customfield_12321', 'customfield_12322', 'customfield_10393'];
            try {
                for (var index = 0; index < checkfieldsArray.length; index++) {
                    issue.issues.forEach(function(element) {

                        if (!element.fields[checkfieldsArray[index]]) {             //Check if all fields in jira tickets are filled
                            throw element.key;
                        }
                    });
                }
                var allIssues = CreateIssueTable(issue);                            //Create object for table with all issues
                
                var statTable = CreateAnalytics(allIssues, period);                 //Create object for analytic tables
                
                if (req.body.graphs != "no graphs") {
                    var dayweeks = req.body.graphs;
                    var chartStat = CreateDataJSON(allIssues, dayweeks);
                    var json = JSON.stringify(chartStat);
                    fs.writeFile(config.cachepath + "/" + config.cachefilename, json, 'utf8', function(err){
                        if(err) throw err;
                    });
                }           
                
                res.render('client', {title: req.body.prod + ' application availability ' + req.body.startDate + ' - ' + req.body.endDate, items: allIssues, tables: statTable, memprod: req.body.prod, memstart: req.body.startDate, memend: req.body.endDate, memgraphs: req.body.graphs});
                
            } catch (error) {
                
                res.render('index', {title: 'Ticket ' + error + ' has an(the) empty field(s)'});
            }

        } else if (startPeriod.isAfter(endPeriod)) {
            
            res.render('index', {title: 'Check Start/End date'});
        } 
        else {

            res.render('index', {title: 'No Results were found'});

        }
    });
});
function CreateIssueTable(objFromJira){                                             //Function prepares data for table with all issues
    var objIssues = [];
    objFromJira.issues.forEach(function(element) {
        var platf = [];
        var durminutes = moment(element.fields.customfield_12320, moment.ISO_8601).diff(moment(element.fields.customfield_12319, moment.ISO_8601), 'minutes');

        element.fields.customfield_10393.forEach(function(plat) {
            platf.push(plat.value)
        });
        objIssues.push({
            key: element.key,
            summary: element.fields.summary,
            aTos: element.fields.customfield_12326,
            rca: element.fields.customfield_12325, 
            start: moment.parseZone(element.fields.customfield_12319).format("h:mm A, DD MMM YY"),
            end: moment.parseZone(element.fields.customfield_12320).format("h:mm A, DD MMM YY"),
            duration: durminutes,
            platf: platf,
            plan: element.fields.customfield_12321.value,
            unaval: element.fields.customfield_12322.value
        });
    });

    return objIssues;
}
function CreateAnalytics(objIssue, periodMin){                                      //Function prepares data for analytic tables
    var PlanUnplanObj = [];
    //var genPlanUnplanObj = [];
    var OpenForCustObj = [];
    var FullObj = [];
    var genOpenForCustObj = [];
    var objStat ={};
    var result = 0;
    var platfArray = ['iOS', 'Android', 'Facebook Canvas', 'Kindle'];
    var fullArray = ['Full', 'Partial'];
    var planArray = ['Planned', 'Unplanned'];
    statTable = [];

    for (var k = 0; k < platfArray.length; k++) {                                   //Create empty array of objects
        objStat={};
        objStat.platf = platfArray[k];
        objStat['OpenForCustperc'] = 0;
        objStat['Fullperc'] = 0;
        for (var j = 0; j < planArray.length; j++) {

            for (var i = 0; i < fullArray.length; i++) {
                objStat[fullArray[i]+planArray[j]+'min'] = 0;
                objStat[fullArray[i]+planArray[j]+'perc'] = 0;
            }
        }
        statTable.push(objStat);
    }

            
    for (var i = 0; i < fullArray.length; i++) {
                        
        for (var j = 0; j < planArray.length; j++) {

            for (var k = 0; k < platfArray.length; k++) {
                PlanUnplanObj = [];
                //genPlanUnplanObj = [];
                OpenForCustObj = [];
                FullObj = [];
                genOpenForCustObj = [];
                objIssue.forEach(function(element) {
                    if (element.unaval == fullArray[i]) {

                        if (element.plan == planArray[j]) {                         //Create Planned/Unplanned objects (by platforms for Full and Partial issues)
                            for (var index = 0; index < element.platf.length; index++) {
                                if (element.platf[index] == platfArray[k]) {
                                    PlanUnplanObj.push(element);
                                }
                            }
                            //genPlanUnplanObj.push(element);
                        }
                        if (element.unaval == fullArray[0]) {                       //Create Opened for customers objects (by platforms)
                            for (var index = 0; index < element.platf.length; index++) {
                                if (element.platf[index] == platfArray[k]) {
                                    OpenForCustObj.push(element); 
                                }
                            }
                            genOpenForCustObj.push(element);
                        }
                    }
                    for (var index = 0; index < element.platf.length; index++) { //Create Full objects (by platforms)
                        if (element.platf[index] == platfArray[k]) {
                            FullObj.push(element); 
                        }
                    }
                });
                result = CheckCollision(PlanUnplanObj, periodMin);                   //Calculate duration for iOS/Android/FB/Kindle planned/unplanned 
                statTable[k][fullArray[i]+planArray[j]+'min'] = result[0];
                statTable[k][fullArray[i]+planArray[j]+'perc'] = result[1];
                if ((i==0)&&(j==1)) {
                result = CheckCollision(OpenForCustObj, periodMin);                  //Calculate duration for iOS/Android/FB/Kindle Partial 
                //objStat['OpenForCustmin'] = result[0];
                statTable[k]['OpenForCustperc'] = result[1];
                }
                result = CheckCollision(FullObj, periodMin);                        //Calculate duration for iOS/Android/FB/Kindle Full 
                //objStat['Fullmin'] = result[0];
                statTable[k]['Fullperc'] = result[1];              
            }
            //result = CheckCollision(genPlanUnplanObj, periodMin);                   //Calculate General duration Full/Partial 
            //statTable['General'+fullArray[i]+planArray[j]+'min'] = result[0];
            //statTable['General'+fullArray[i]+planArray[j]+'perc'] = result[1];
        }
        if (i==0) {
        result = CheckCollision(genOpenForCustObj, periodMin);                      //Calculate General duration Partial 
        statTable['GeneralOpenForCustperc'] = result[1];
        }
    }
    result = CheckCollision(objIssue, periodMin);                                    //Calculate General duration Full 
    statTable['GeneralFullperc'] = result[1];
    return statTable;
}
function CreateDataJSON(objIssue, timeGraph){
    var durdays = moment(endPeriod).diff(moment(startPeriod), timeGraph);
    endPeriod = moment(startPeriod).add(1,timeGraph)
    var durtemp = moment(endPeriod).diff(moment(startPeriod), 'minutes');
    chartStat = [];
    for (var index = 0; index < durdays; index++) {
        var tempstatTable = [];
        // console.log("\x1b[0m", 'index ' + index);
        // console.log(startPeriod);
        // console.log(endPeriod);
        // console.log(durtemp);
        objIssue.forEach(function(element) {
            //console.log(element.start);
            //console.log(element.end);
            if (((moment(element.start, "h:mm A, DD MMM YY").isSameOrAfter(startPeriod))||(moment(element.end, "h:mm A, DD MMM YY").isSameOrAfter(startPeriod)))&&((moment(element.start, "h:mm A, DD MMM YY").isSameOrBefore(endPeriod))||(moment(element.end, "h:mm A, DD MMM YY").isSameOrBefore(endPeriod)))) {
                //console.log('\x1b[36m%s\x1b[0m', 'element');
                tempstatTable.push(element); 
            }
                                 
        });
        tempstatTable = CreateGraphs(tempstatTable, durtemp);
        chartStat.push({
                date: timeGraph == "weeks" ? moment(startPeriod).add(1,timeGraph).format("DD-MMM-YY") : moment(startPeriod).format("DD-MMM-YY"),
                general: (100 - tempstatTable.GeneralFullperc).toFixed(3),
                ios: (100 - tempstatTable[0].Fullperc).toFixed(3),
                android: (100 - tempstatTable[1].Fullperc).toFixed(3),
                canvas: (100 - tempstatTable[2].Fullperc).toFixed(3),
                kindle: (100 - tempstatTable[3].Fullperc).toFixed(3)
            })
        if (durdays == 1) {
            chartStat.push({
                date: timeGraph == "weeks" ? moment(startPeriod).add(1,timeGraph).format("DD-MMM-YY") : moment(startPeriod).format("DD-MMM-YY"),
                general: (100 - tempstatTable.GeneralFullperc).toFixed(3),
                ios: (100 - tempstatTable[0].Fullperc).toFixed(3),
                android: (100 - tempstatTable[1].Fullperc).toFixed(3),
                canvas: (100 - tempstatTable[2].Fullperc).toFixed(3),
                kindle: (100 - tempstatTable[3].Fullperc).toFixed(3)
            })
        }
        //console.log('\x1b[35m', tempstatTable.GeneralFullperc);    
        startPeriod = endPeriod;
        endPeriod = moment(endPeriod).add(1,timeGraph);
    }
    //console.log("\x1b[33m", chartStat);
    return chartStat;
}
function CreateGraphs(objIssue, periodMin){                                         //Function prepares data for graphs
    var FullObj = [];
    var objStat ={};
    var result = 0;
    var platfArray = ['iOS', 'Android', 'Facebook Canvas', 'Kindle'];
    var fullArray = ['Full', 'Partial'];
    var planArray = ['Planned', 'Unplanned'];
    tempstatTable = [];
            
    for (var i = 0; i < fullArray.length; i++) {
                        
        for (var j = 0; j < planArray.length; j++) {

            for (var k = 0; k < platfArray.length; k++) {
                FullObj = [];
                objIssue.forEach(function(element) {
                    for (var index = 0; index < element.platf.length; index++) { //Create Full objects (by platforms)
                        if (element.platf[index] == platfArray[k]) {
                            FullObj.push(element); 
                        }
                    }
                });
                result = CheckCollision(FullObj, periodMin);                        //Calculate duration for iOS/Android/FB/Kindle Full 
                objStat['Fullperc'] = result[1];
                if ((i==1)&&(j==1)) {
                    tempstatTable[k] = clone(objStat);                                   //Add Stat objects to StatArray
                }
            }
        }
    }
    result = CheckCollision(objIssue, periodMin);                                    //Calculate General duration Full 
    tempstatTable['GeneralFullperc'] = result[1];
    return tempstatTable;
}
function CheckCollision(objtemp, periodMin) {                                       //Function checks collision and calculate duration of maintenances 
    var min = 0;
    var starttime = moment(0).format('h:mm A, DD MMM YY');
    var endtime = moment(0).format('h:mm A, DD MMM YY');
    var tempstart, tempend, tempdurmin;
    objtemp.forEach(function(element) {
        tempstart = element.start;
        tempend = element.end;
        tempdurmin = element.duration;
        //console.log("\x1b[35m", startPeriod);
        //console.log("\x1b[37m", endPeriod);
        if (startPeriod.isBetween(moment(tempstart, 'h:mm A, DD MMM YY'), moment(tempend, 'h:mm A, DD MMM YY'))) {
            tempstart = startPeriod;
            tempdurmin = moment(tempend, 'h:mm A, DD MMM YY').diff(moment(tempstart, 'h:mm A, DD MMM YY'), 'minutes');
        }     
        if (endPeriod.isBetween(moment(tempstart, 'h:mm A, DD MMM YY'), moment(tempend, 'h:mm A, DD MMM YY'))) {
            tempend = endPeriod;
            tempdurmin = moment(tempend, 'h:mm A, DD MMM YY').diff(moment(tempstart, 'h:mm A, DD MMM YY'), 'minutes');           
        }  
             
        if (moment(endtime, 'h:mm A, DD MMM YY').isBetween(moment(tempstart, 'h:mm A, DD MMM YY'), moment(tempend, 'h:mm A, DD MMM YY'))) {
                var tempdur = moment(tempend, 'h:mm A, DD MMM YY').diff(moment(endtime, 'h:mm A, DD MMM YY'), 'minutes');
                min += parseInt(tempdur, 10);
                starttime = starttime;
                endtime = tempend;
                
        } else if (moment(endtime, 'h:mm A, DD MMM YY').isAfter(moment(tempend, 'h:mm A, DD MMM YY'))){
                starttime = starttime;                    
                endtime = endtime;
        } else {
                min += parseInt(tempdurmin, 10); 
                starttime = tempstart;                    
                endtime = tempend;
        }
    });
    if (periodMin == 0){
        perc = 0;
    }
    else {
        perc = parseFloat(((min/periodMin)*100).toFixed(3));
    }

    if (perc==0) perc.toFixed(0);

    return [min, perc];
}

module.exports = router;