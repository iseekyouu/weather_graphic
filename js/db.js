(function(wnd) {
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

    var db;
    var version = 13;
    var dbname = 'MyTestDatabase';
    var request = window.indexedDB.open(dbname, version);
    var lastMonthInArchive = '2006-12';
    var db_export = {
        addRecord: addData,
        clearObjectStore: clearobjectStore
    };
    
    var debug = 1;
    var cleardb = 0;
    
    
    request.onerror = function (event) {
        console.log("Database error: " + event.target.errorCode);
    };
   
    /*
    * при успешном подключении к бд
    * выполняем инициализацию данных
    * */
    request.onsuccess = async function (event) {
        db = request.result;
        db_export.db = db;
        wnd.db = db_export;

        if (debug) console.time('getDataByName temperature');
        await getDataByName('temperature');
        if (debug) console.timeEnd('getDataByName temperature');

        if (debug) console.time('getDataBytestName precipitation');
        await getDataByName('precipitation');
        if (debug) console.timeEnd('getDataByName precipitation');

    };

    /*
    * Получение информации по конкретному типу данных
    * определение способа получения из БД или с сервера
    * @param name {String}
    * */
    async function getDataByName(name){
        let count = await getCount(name);
        let action = `get` + name[0].toUpperCase() + name.substr(1);

        if (debug) console.log(name, count);

        if (count > 0)  {

            if (cleardb){
                clearobjectStore(name);
                return false;
            }

            var arr = await getDataFromObjectStore(name);

            /**
             * добавление записей в бд - самая медленная операция
             * возможен такой вариант что при быстром обновлении страницы (например 2 или три раза
             * подряд нажали f5) не вся информация попадет в бд
             * тогда при последующем обновлении информация будет не полная
             * чтобы этого избежать проверим последний элемент
             * и если он не тот какой нужен, еще раз запросим информацию с сервера
             * так как в хранилищах есть индекс на уникальность по "t", при повторном добавлении
             * данные не задублируются, в консоли будет отображено соответствующее сообщение
             * о попытке нарушения уникальности
             * */
            if (arr[arr.length-1].t.indexOf(lastMonthInArchive) > -1 ){

                if (debug) console.log('information from DB');

                worker.postMessage({cmd: 'set-graphic-arr', name: name, arr: arr});
            } else{
                await getFromDBase(action, name);
            }
        } else {
            await getFromDBase(action, name);
        }

    }           

    async function getFromDBase(action, name){
        var json = await getJsonData(action);

        if (json){
            if (debug) console.log('information from Server');
            var arr = JSON.parse(json);
            worker.postMessage( {'cmd': 'insert-to-database', arr: arr, name: name });
        } else {
            return false;
        }
    }

    request.onblocked = function(event){
        console.log('Db blocked!');
    };

    request.onupgradeneeded = function (event) {
        db = request.result;
        db.deleteObjectStore('temperature');
        db.deleteObjectStore('precipitation');

        if (!db.objectStoreNames.contains('temperature')) {
            var objectStoreT = db.createObjectStore("temperature", {keyPath: "id", autoIncrement: true});
            objectStoreT.createIndex("id", "id", {unique: true});
            objectStoreT.createIndex("t", "t", {unique: true});
        }
        
        if (!db.objectStoreNames.contains('precipitation')) {
            var objectStoreP = db.createObjectStore("precipitation", {keyPath: "id", autoIncrement: true});
            objectStoreP.createIndex("id", "id", {unique: true});
            objectStoreP.createIndex("t", "t", {unique: true});
        }
    };


    /**
    *  Promise для получение информации с сервера
     *  @param action {String} название действия которое необходимо выполнить
    */
    function getJsonData (action) {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", 'index.php?' + action, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send();
            xhr.onreadystatechange = function() {
                if (xhr.readyState != 4) return;

                if (xhr.status != 200) {
                    reject(xhr.status + ': ' + xhr.statusText);
                } else {
                    resolve(xhr.responseText);
                }

            }
        })

    }

    /**
     * Добавление записей в БД
     * @param name {String} название хранилища объектов
     * @param data {Object} объект с банными для записи
     * */
    function addData(name, data){
        var transaction = db.transaction([name], "readwrite");

        transaction.onerror = function(event) {
            console.log('addData error', event);
        };

        var objectStore = transaction.objectStore(name);
        var request = objectStore.add(data);

        request.onsuccess = function(event) {
        };

    }

    /**
     * Promise для определения количества записей в хранилище объектов
     *  @param objectStoreName {String}
     *
     * */
    function getCount(objectStoreName){
        return new Promise((resolve, reject) => {
            //var transaction = db.transaction([objectStoreName]);
            var transaction = new MyTransaction('count', objectStoreName);
            var objectStore = transaction.objectStore(objectStoreName);
            var countRequest = objectStore.count();

            countRequest.onsuccess = function(event){
                let count = event.currentTarget.result;
                resolve(count);
            }
        })
    }

    /**
     * Обертка для транзакций
     *  @param name {String} название транзакции
     *  @param objectStoreName {String}
     * */
    function MyTransaction(name, objectStoreName){
        var transaction = db.transaction([objectStoreName]);
        transaction.onerror = function(event) {
            console.log(name, 'error', event);
        };

        return transaction;
    };

    /**
     * Promise для получение информации из хранилища объектов
     * @param objectStoreName {String}
    * */
    function getDataFromObjectStore(objectStoreName){
        return new Promise((resolve, reject) => {
            var transaction = new MyTransaction('getData', objectStoreName);

            var objectStore = transaction.objectStore(objectStoreName);
            var cursor = objectStore.openCursor();
            var arr = [];
            cursor.onsuccess = function(event) {
                let cursor = event.target.result;
                if (cursor) {
                    arr.push(cursor.value);
                    cursor.continue();
                }
                else {
                    resolve(arr);
                };
            };
        })
    }

    /**
     * Очистка хранилища
     *  @param objectStoreName {String}
    * */
    function clearobjectStore(objectStoreName){
        var request = db.transaction([objectStoreName], "readwrite");
        var objectStore = request.objectStore(objectStoreName);

        var clearRequest = objectStore.clear();

        clearRequest.onsuccess = function(event){
            console.log('clear of', objectStoreName, 'successfull');
        };

        clearRequest.onerror = function(event){
            console.log('Can not clear objectStore:', objectStoreName);
        }

    }
}(Window));



