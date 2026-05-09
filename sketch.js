/**
 * sketch.js
 * Boundary X Bluetooth Keypad Logic (ESP32 Version - TX Fixed)
 */

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // 쓰기 전용 통로
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // 읽기 전용 통로

let bluetoothDevice = null;
let rxCharacteristic = null; // 내부적으로 쓰기 권한이 있는 통로가 할당됩니다.
let isConnected = false;
let bluetoothStatus = "연결 대기 중"; 

function setup() {
  noCanvas(); 
  createBluetoothUI();
  createKeypadUI(); 
}

function createBluetoothUI() {
  const statusElement = select("#bluetoothStatus");
  if (statusElement) statusElement.html(`상태: ${bluetoothStatus}`);

  const buttonContainer = select("#bluetooth-control-buttons");
  if (buttonContainer) {
    const connectButton = createButton("기기 연결").addClass("start-button");
    connectButton.mousePressed(connectBluetooth);
    buttonContainer.child(connectButton);

    const disconnectButton = createButton("연결 해제").addClass("stop-button");
    disconnectButton.mousePressed(disconnectBluetooth);
    buttonContainer.child(disconnectButton);
  }
}

// 1~12 키패드 생성 및 이벤트 연결
function createKeypadUI() {
    const keypadContainer = select("#keypad-container");
    if (!keypadContainer) return;

    for (let i = 1; i <= 12; i++) {
        let btn = createButton(String(i));
        btn.addClass("key-button");        
        
        btn.mousePressed(() => {
            handleKeypadInput(i);
        });

        keypadContainer.child(btn);
    }
}

function handleKeypadInput(number) {
    if (!isConnected) {
        alert("먼저 ESP32와 연결해주세요.");
        return;
    }

    const dataToSend = String(number);
    sendBluetoothData(dataToSend);
    
    const display = select("#sentDataDisplay");
    if (display) {
        display.html(dataToSend);
        display.style("color", "#fff");
        setTimeout(() => display.style("color", "#0f0"), 200);
    }
}

function updateBluetoothStatusUI(type) {
  const el = select("#bluetoothStatus");
  if (el) {
    el.removeClass("status-connected");
    el.removeClass("status-error");
    el.html(`상태: ${bluetoothStatus}`);

    if (type === 'connected') {
      el.addClass("status-connected");
    } else if (type === 'error') {
      el.addClass("status-error");
    }
  }
}

async function connectBluetooth() {
  try {
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "ESP" }],
      optionalServices: [UART_SERVICE_UUID],
    });
    const server = await bluetoothDevice.gatt.connect();
    const service = await server.getPrimaryService(UART_SERVICE_UUID);
    
    // 핵심 수정 부분: 데이터를 보내기 위해 UART_TX_CHARACTERISTIC_UUID(...0002)를 사용합니다.
    rxCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);
    
    isConnected = true;
    bluetoothStatus = `${bluetoothDevice.name} 연결됨`;
    updateBluetoothStatusUI('connected');
    
  } catch (error) {
    console.error("Connection failed", error);
    bluetoothStatus = "연결 실패 (다시 시도해주세요)";
    updateBluetoothStatusUI('error');
  }
}

function disconnectBluetooth() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  isConnected = false;
  bluetoothDevice = null;
  rxCharacteristic = null;
  
  bluetoothStatus = "연결 해제됨";
  updateBluetoothStatusUI('default');
}

async function sendBluetoothData(data) {
  if (!rxCharacteristic || !isConnected) return;
  try {
    const encoder = new TextEncoder();
    // 데이터를 전송할 때 줄바꿈 기호를 포함하여 전송합니다.
    await rxCharacteristic.writeValue(encoder.encode(`${data}\n`));
    console.log("Sent:", data);
  } catch (e) {
    console.error("Send error:", e);
    alert("데이터 전송 중 오류가 발생했습니다.");
  }
}
