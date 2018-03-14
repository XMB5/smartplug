/////////////////////////////////////////////////////////////////////////////
/** @file
Settings

\copyright Copyright (c) 2018 Chris Byrne. All rights reserved.
Licensed under the MIT License. Refer to LICENSE file in the project root. */
/////////////////////////////////////////////////////////////////////////////
#ifndef INCLUDED__SETTINGS
#define INCLUDED__SETTINGS

//- includes
#include "property.h"
#include <functional>

/// JSON-RPC error codes
enum class JsonRpcError {
    NO_ERROR            = 0,        ///< indicates no error
    // error codes from and including -32768 to -32000 are reserved for pre-defined errors
    PARSE_ERROR         = -32700,   ///< Parse error - Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.
    INVALID_REQUEST     = -32600,   ///< Invalid Request - The JSON sent is not a valid Request object
    METHOD_NOT_FOUND    = -32601,   ///< Method not found - The method does not exist / is not available
    INVALID_PARAMS      = -32602,   ///< Invalid params - Invalid method parameter(s)
    INTERNAL_ERROR      = -32603,   ///< Internal error - Internal JSON-RPC error
    // SERVER_ERROR = -32000 to -32099    Server error    Reserved for implementation-defined server-errors.
};

/////////////////////////////////////////////////////////////////////////////
/// persistent settings
class Settings {
public:
    /// response to command request
    using CommandResult = std::pair<JsonRpcError, JsonVariant>;
    /// callback for dirty property notifications
    using FuncOnDirtyProperties = std::function<void (const JsonObject&, JsonBuffer& buffer)>;

    Settings();

    void begin();
    void tick();

    /////////////////////////////////////////////////////////////////////////
    /// output JSON
    JsonObject& toJson(JsonBuffer& buffer) {
        return propRoot_.toJson(buffer);
    }

    /////////////////////////////////////////////////////////////////////////
    /// dirty properties
    void onDirtyProperties(FuncOnDirtyProperties onDirtyProperties) {
        onDirtyProperties_ = std::move(onDirtyProperties);
    }

    CommandResult onCommand(const char* method, const JsonObject& params, JsonBuffer& buffer);

private:
    PropertyNode            propRoot_;
    PropertyNode            propSys_;
    PropertyNode            propTest_;
    PropertyInt             propTestInt_;

    FuncOnDirtyProperties   onDirtyProperties_;   ///< on dirty property notification
    unsigned long           lastMillis_{0};       ///< last dirty check
};

#endif // INCLUDED__SETTINGS
