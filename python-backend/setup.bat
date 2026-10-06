@echo off
echo Creating virtual environment...
py -3.10 -m venv venv
if errorlevel 1 (
    echo py -3.10 failed, trying py...
    py -m venv venv
    if errorlevel 1 (
        echo py failed, trying python...
        python -m venv venv
        if errorlevel 1 (
            echo Failed to create virtual environment!
            exit /b 1
        )
    )
)

echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo Failed to activate virtual environment!
    exit /b 1
)

echo Installing requirements...
pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install requirements!
    exit /b 1
)

echo Starting FastAPI server...
uvicorn main:app --reload
