import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../pages/ConversationPracticePage.css';
import frame34 from "../image/Frame 34.svg";
import ai_men from "../image/aimento.png";
import logoImg from "../image/mentorme_logo.png";

const questions = [
  { tag: '문제해결 역량', text: '과제나 프로젝트를 수행하는 과정에서 문제가 발생하여 해결했던 경험에 대해 이야기해주세요.' },
  { tag: '협업 경험', text: '팀 프로젝트에서 갈등이 있었던 경험과 어떻게 해결했는지 말씀해주세요.' },
  { tag: '성장 경험', text: '본인이 성장했다고 느꼈던 경험에 대해 이야기해주세요.' },
  { tag: '지원 동기', text: '해당 직무나 회사에 지원하게 된 계기를 말씀해주세요.' }
];

const ConversationPracticePage = () => {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [mediaStream, setMediaStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [loading, setLoading] = useState(false); // ✅ 로딩 상태 추가
  const navigate = useNavigate();

  const uploadToWhisper = async (blob) => {
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");

    try {
      const response = await fetch('http://localhost:8000/stt/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('STT 결과:', data.text);
      return data.text;
    } catch (error) {
      console.error('STT 업로드 실패:', error);
      return null;
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setQuestionIndex((prev) => (prev + 1) % questions.length);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const startAutoRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setMediaStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          setLoading(true); // ✅ 녹화 중단 시 로딩 true
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setRecordedBlob(blob);
          stream.getTracks().forEach(track => track.stop());

          const sttText = await uploadToWhisper(blob);
          const videoUrl = URL.createObjectURL(blob);

          navigate('/feedback', {
            state: {
              videoUrl,
              sttText: sttText || "",
              type: 'conversation',
            }
          });
        };

        mediaRecorder.start();
        setRecording(true);
      } catch (err) {
        console.error('카메라/마이크 접근 오류:', err);
      }
    };

    startAutoRecording();
  }, []);

  useEffect(() => {
    let interval;
    if (recording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFeedbackClick = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setLoading(true); // ✅ 버튼 눌렀을 때 로딩
      mediaRecorderRef.current.stop();
      setRecording(false);
    } else if (recordedBlob) {
      const videoUrl = URL.createObjectURL(recordedBlob);
      navigate('/feedback', {
        state: {
          videoUrl,
          sttText: "",
          type: 'conversation'
        }
      });
    } else {
      alert('녹화된 영상이 없습니다.');
    }
  };

  return (
    <>
     {loading && ( // ✅ 로딩 오버레이
        <div className="loading-overlay">
          <div className="spinner" />
          <p>🌀 분석 중입니다. 잠시만 기다려주세요...</p>
          분석 시간이 많이 지연될 수도 있습니다 !
        </div>
      )}

      {!loading && ( // ✅ 로딩 아닐 때만 원래 화면
        <>
          <div className="header-container">
            <div className="title-box">
              <div className="title-logo">
                <img src={logoImg} alt="로고" className="logo-img" />
              </div>
              <span className="title-text">대화형 실전 면접</span>
            </div>
            <button className="exit-button" onClick={() => navigate('/')}>나가기</button>
          </div>
          <hr className="hrline" />
          <div className="interview-container">
            <div className="question-container">
              <img className="img" alt="Frame" src={frame34} />
              <div className="question-section">
                <span className="question-tag">🧠 {questions[questionIndex].tag}</span>
                <p className="question-text">{questions[questionIndex].text}</p>
              </div>
            </div>

            <div className="interview-video-section">
              <div className="ai-interviewer">
                <p>AI 면접관 화면</p>
                <img src={ai_men} alt="AI 면접관" className="face-image" />
              </div>

              <div className="user-camera">
                <p>나의 화면</p>
                <video ref={videoRef} autoPlay muted className="video-preview" />

                {recording && (
                  <div className="recording-bar">
                    <div className="recording-indicator">🔴 녹화중 {formatTime(recordingTime)}</div>
                    <div className="waveform">
                      <div className="bar"></div>
                      <div className="bar"></div>
                      <div className="bar"></div>
                      <div className="bar"></div>
                      <div className="bar"></div>
                    </div>
                    <button className="feedback-button" onClick={handleFeedbackClick}>피드백 보러가기</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ConversationPracticePage;
