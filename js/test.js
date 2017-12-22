test = {
    temperature: [],
    percipitation: [],
    
    getJsonData: function (action, name, cb) {
       if (!action) return;
        
        var xhr = new XMLHttpRequest();
        xhr.open("GET", 'index.php?' + action, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send();
        xhr.onreadystatechange = function() {
            if (xhr.readyState != 4) return;

            if (xhr.status != 200) {
                alert(xhr.status + ': ' + xhr.statusText);
            } else {
                cb(name, xhr.responseText);
            }

        }
    },
    
    init: function(){
        let self = this;
        let cb = (name, response) => {
            self[name] = JSON.parse(response);
            self.tests.avg.call(self, name);
        };
        
        this.getJsonData('getTemperature', 'temperature', cb);
        this.getJsonData('getPrecipitation','precipitation', cb);
    },

    tests: {
        avg: function (name){
            var data = this[name];
            avgArr = [];
            for (var i = 0; i < 10; i++){
                avgArr.push(data[i].v)
            }

            let v =
                parseFloat(
                    avgArr.reduce( (a, b) => { return a + b } ) /
                    ( avgArr.length == 0 ? 1 : avgArr.length)
                ).toFixed(1);
            console.log(v);
        },
        cleardb: function (name){
            var db;
            var version = 12;
            var dbname = 'MyTestDatabase';
            var request = window.indexedDB.open(dbname, version);
            request.onsuccess = function (event) {
                var db = event.target.result;
                var transaction = db.transaction([name], "readwrite");

                transaction.onerror = function(event) {
                    console.log('addData error', event);
                };

                var objectStore = transaction.objectStore(name);
                var request = objectStore.clear();

                request.onsuccess = function(event) {
                    console.log('successfull clear', name)
                };
            };
        },
        clearObjectStore:function (){
            debugger;
            Window.db.clearObjectStore('temperature');
            Window.db.clearObjectStore('precipitation');
        }        
    }

};



