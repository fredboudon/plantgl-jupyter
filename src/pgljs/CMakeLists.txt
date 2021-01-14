cmake_minimum_required(VERSION 3.5)

if(DEFINED ENV{EMSDK})
  set(EMSCRIPTEN_ROOT "$ENV{EMSDK}/upstream/emscripten")
  message(STATUS "EMSCRIPTEN_ROOT set to ${EMSCRIPTEN_ROOT}")
  include(FindPythonInterp)
  if(NOT PYTHONINTERP_FOUND)
    message(
      FATAL_ERROR
        "Python required for Emscripten builds, but cmake cannot find it.")
  endif()
  set(CMAKE_TOOLCHAIN_FILE "${EMSCRIPTEN_ROOT}/cmake/Modules/Platform/Emscripten.cmake")
else()
  message(
    FATAL_ERROR
      "The EMSDK environment variable must be set. See README.md.")
endif()

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED True)

project(pgljs C CXX)

message(CMAKE_BUILD_TYPE: ${CMAKE_BUILD_TYPE})

set(pgljs_sources src/pgljs.cpp)

file(GLOB_RECURSE pgl_sources
  "plantgl/src/cpp/plantgl/algo/codec/scne_binaryparser.cpp"
  "plantgl/src/cpp/plantgl/algo/codec/binaryprinter.cpp"
  "plantgl/src/cpp/plantgl/algo/base/discretizer.cpp"
  "plantgl/src/cpp/plantgl/algo/base/tesselator.cpp"
  "plantgl/src/cpp/plantgl/algo/base/merge.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/core/*.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/scene/*.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/geometry/*.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/transformation/*.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/container/*.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/appearance/color.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/appearance/appearance.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/appearance/material.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/appearance/spectrum.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/appearance/texture.cpp"
  "plantgl/src/cpp/plantgl/scenegraph/function/function.cpp"
  "plantgl/src/cpp/plantgl/algo/base/matrixcomputer.cpp"
  "plantgl/src/cpp/plantgl/algo/base/bboxcomputer.cpp"
  "plantgl/src/cpp/plantgl/math/*.cpp"
  "plantgl/src/cpp/plantgl/tool/util_array*"
  "plantgl/src/cpp/plantgl/tool/timer.cpp"
  "plantgl/src/cpp/plantgl/tool/errormsg.cpp"
  "plantgl/src/cpp/plantgl/tool/util_enviro.cpp"
  "plantgl/src/cpp/plantgl/tool/bfstream.cpp"
  "plantgl/src/cpp/plantgl/tool/dirnames.cpp"
)

set(DEBUG_FLAGS
  "-s ALLOW_MEMORY_GROWTH=1"
  "--memory-init-file 0"
  "-DPGL_CORE_WITHOUT_QT"
  "-DPGL_USE_FLOAT"
  "-s ASSERTIONS=1"
  "-s DEMANGLE_SUPPORT=1"
  "-s DISABLE_EXCEPTION_CATCHING=0"
  "-g4"
  )

  set(RELEASE_FLAGS
  "-s ALLOW_MEMORY_GROWTH=1"
  "--memory-init-file 0"
  "-DPGL_CORE_WITHOUT_QT"
  "-DPGL_USE_FLOAT"
  "-s ASSERTIONS=0"
  "-s DISABLE_EXCEPTION_CATCHING=1"
)

if(CMAKE_BUILD_TYPE MATCHES Debug)
  add_definitions(${DEBUG_FLAGS})
else()
  add_definitions(${RELEASE_FLAGS})
endif()

if(CMAKE_BUILD_TYPE MATCHES Debug)
  set(CMAKE_EXE_LINKER_FLAGS
    "-s INITIAL_MEMORY=8MB\
    -s ALLOW_MEMORY_GROWTH=1\
    -s ASSERTIONS=2\
    -s EXPORT_ES6=1\
    -s USE_ES6_IMPORT_META=0\
    -s MODULARIZE=1\
    -s EXPORT_NAME='PGL'\
    --no-entry\
    -s LLD_REPORT_UNDEFINED\
    -s DISABLE_EXCEPTION_CATCHING=0\
    -g4\
    --source-map-base http://localhost:5000/build/"
  )
else()
  set(CMAKE_EXE_LINKER_FLAGS
    "-s INITIAL_MEMORY=8MB\
    -s ALLOW_MEMORY_GROWTH=1\
    -s EXPORT_ES6=1\
    -s USE_ES6_IMPORT_META=0\
    -s MODULARIZE=1\
    -s EXPORT_NAME='PGL'\
    --no-entry"
  )
endif()

set(idl ${CMAKE_CURRENT_SOURCE_DIR}/src/pgljs.webidl)

execute_process(COMMAND ${PYTHON_EXECUTABLE}
    ${EMSCRIPTEN_ROOT}/tools/webidl_binder.py
    ${idl} ${CMAKE_BINARY_DIR}/glue)

if(NOT EXISTS ${CMAKE_BINARY_DIR}/glue.cpp)
   message(FATAL_ERROR "Glue generation failed.")
 endif()

add_custom_command(OUTPUT ${CMAKE_BINARY_DIR}/glue.cpp
  COMMAND ${PYTHON_EXECUTABLE}
         ${EMSCRIPTEN_ROOT}/tools/webidl_binder.py
         ${idl} ${CMAKE_BINARY_DIR}/glue
 DEPENDS ${idl}
 COMMENT "Generating ${CMAKE_BINARY_DIR}/glue.cpp."
 WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
 VERBATIM)

set_property(SOURCE ${pgljs_sources}
    APPEND
    PROPERTY OBJECT_DEPENDS ${CMAKE_BINARY_DIR}/glue.cpp)

add_executable(pgljs src/pgljs_glue_wrapper.cpp ${pgljs_sources} ${pgl_sources})
set_target_properties(pgljs PROPERTIES OUTPUT_NAME pgl)

em_link_pre_js(pgljs src/pre.js)
em_link_post_js(pgljs
  ${CMAKE_BINARY_DIR}/glue.js
  src/api.js
)

target_include_directories(pgljs PUBLIC ${CMAKE_BINARY_DIR})
target_include_directories(pgljs PRIVATE ${PROJECT_SOURCE_DIR}/plantgl/src/cpp)
