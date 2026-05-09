/**
 * sketch.js
 * Boundary X Bluetooth Keypad Logic (ESP32 Version)
 */

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

let bluetoothDevice = null;
let rxCharacteristic = null;
let isConnected = false;
let bluetoothStatus = "연결 대기 중"; 

function setup() {
  noCanvas(); 
  createBluetoothUI();
  createKeypadUI(); // 키패드 생성 함수 호출
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

    // 1부터 12까지 버튼 생성
    for (let i = 1; i <= 12; i++) {
        let btn = createButton(String(i)); // 버튼 텍스트
        btn.addClass("key-button");        // CSS 클래스 적용
        
        // 버튼 클릭(터치) 시 이벤트
        btn.mousePressed(() => {
            handleKeypadInput(i);
        });

        keypadContainer.child(btn);
    }
}

// 키패드 입력 처리
function handleKeypadInput(number) {
    if (!isConnected) {
        // 경고 메시지 수정됨
        alert("먼저 ESP32와 연결해주세요.");
        return;
    }

    const dataToSend = String(number);
    sendBluetoothData(dataToSend);
    
    // UI 업데이트 (확인 창)
    const display = select("#sentDataDisplay");
    if (display) {
        display.html(dataToSend);
        // 시각적 효과 (깜빡임)
        display.style("color", "#fff");
        setTimeout(() => display.style("color", "#0f0"), 200);
    }
}

// UI Color Update Logic
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
      // 기기 이름 필터 수정됨
      filters: [{ namePrefix: "ESP" }],
      optionalServices: [UART_SERVICE_UUID],
    });
    const server = await bluetoothDevice.gatt.connect();
    const service = await server.getPrimaryService(UART_SERVICE_UUID);
    rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);
    isConnected = true;
    
    // Connected (Green)
    bluetoothStatus = `${bluetoothDevice.name} 연결됨`;
    updateBluetoothStatusUI('connected');
    
  } catch (error) {
    console.error("Connection failed", error);
    // Error (Red)
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
  
  // Default (Grey)
  bluetoothStatus = "연결 해제됨";
  updateBluetoothStatusUI('default');
}

async function sendBluetoothData(data) {
  if (!rxCharacteristic || !isConnected) return;
  try {
    const encoder = new TextEncoder();
    // ESP32 수신부에서 \n을 기준으로 처리하도록 기존 로직 유지
    await rxCharacteristic.writeValue(encoder.encode(`${data}\n`));
    console.log("Sent:", data);
  } catch (e) {
    console.error("Send error:", e);
    alert("데이터 전송 중 오류가 발생했습니다.");
  }
}
