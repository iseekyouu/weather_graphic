<?php

if (array_key_exists('getTemperature', $_REQUEST)) {
    getFile('/temperature/temperature.json');
    return true;
}
else if (array_key_exists('getPrecipitation', $_REQUEST)){
    getFile('/precipitation/precipitation.json');
    return true;
}

require('index.html');

function getFile($path){
    $pathToFile = $_SERVER['DOCUMENT_ROOT'] . $path;
    if (file_exists($pathToFile)) {
        $GetContentFile = file_get_contents($pathToFile);
        echo $GetContentFile;
    }
}